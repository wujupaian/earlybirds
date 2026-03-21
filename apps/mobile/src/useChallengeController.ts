import { useEffect, useState } from "react";
import * as Localization from "expo-localization";
import { Linking } from "react-native";
import {
  getActiveChallenges,
  getChallengeDetail,
  getChallengeHistory,
  getPaymentStatus,
  initiateChallenge,
  requestNonce,
  submitCheckin,
  updateTimezone,
  uploadFcmToken,
  verifyWallet,
  type ChallengeSummary,
  type CheckinRecord,
} from "./api";
import {
  registerForPushNotificationsAsync,
  scheduleLocalCheckinReminder,
} from "./notifications";
import { createSolanaPayUrl } from "./solana/payment";
import { authenticateWithMobileWallet } from "./solana/walletAuth";
import { useAppStore } from "./store/useAppStore";

export function useChallengeController() {
  const {
    authToken,
    walletAddress,
    timezone,
    activeChallenge,
    homeState,
    dayNumber,
    rewardAmount,
    connectWallet,
    setActiveChallenge,
    setHomeState,
    setDayNumber,
  } = useAppStore();
  const [notificationState, setNotificationState] = useState<{
    permissionStatus?: string;
    devicePushToken?: string;
    uploaded?: boolean;
    error?: string;
  }>({});
  const [history, setHistory] = useState<ChallengeSummary[]>([]);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Ready");

  useEffect(() => {
    if (!authToken) {
      return;
    }
    void syncChallengeState(authToken);
  }, [authToken]);

  useEffect(() => {
    if (!paymentReference || !authToken) {
      return;
    }
    const timer = setInterval(() => {
      void pollPaymentStatus(paymentReference);
    }, 3000);
    void pollPaymentStatus(paymentReference);
    return () => clearInterval(timer);
  }, [paymentReference, authToken]);

  async function syncChallengeState(token: string) {
    const [activeResponse, historyResponse] = await Promise.all([
      getActiveChallenges(token),
      getChallengeHistory(token),
    ]);

    const current = activeResponse.challenges[0] ?? null;
    setActiveChallenge(current);
    setHistory(historyResponse.challenges);

    let completedCount = 0;
    if (current) {
      const detail = await getChallengeDetail({
        authToken: token,
        challengeId: current.id,
      });
      setCheckins(detail.checkins);
      completedCount = detail.checkins.filter((item) => item.checkedIn).length;
      setDayNumber(Math.min(7, Math.max(1, completedCount + (completedCount === 7 ? 0 : 1))));
    } else {
      setCheckins([]);
      setDayNumber(1);
    }

    if (!current) {
      setHomeState("no-active");
      return;
    }
    if (current.status === "pending_payment") {
      setHomeState("pending-payment");
      setPaymentReference(current.referencePubkey);
      setPaymentUrl(null);
      return;
    }
    if (current.status === "active") {
      setHomeState(completedCount > 0 ? "checked-in" : "active-countdown");
      return;
    }
    if (current.status === "completed") {
      setHomeState("completed");
      return;
    }
    if (current.status === "rewarded") {
      setHomeState("rewarded");
      return;
    }
    if (current.status === "failed") {
      setHomeState("missed");
    }
  }

  async function handleConnectWallet() {
    const timezoneToUse = Localization.getCalendars()[0]?.timeZone ?? timezone;
    setIsAuthenticating(true);
    setStatusMessage("Authorizing wallet");

    try {
      const signedNonce = await authenticateWithMobileWallet(async (walletAddress) => {
        setStatusMessage("Requesting wallet nonce");
        return requestNonce(walletAddress);
      });
      const verified = await verifyWallet({
        walletAddress: signedNonce.walletAddress,
        signature: signedNonce.signature,
        timezone: timezoneToUse,
      });
      await updateTimezone({
        authToken: verified.token,
        timezone: timezoneToUse,
      });
      connectWallet({
        walletAddress: verified.walletAddress,
        authToken: verified.token,
        timezone: timezoneToUse,
      });
      setStatusMessage("Wallet connected through signed message auth");
      await syncChallengeState(verified.token);
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "CONNECT_WALLET_FAILED";
      setStatusMessage(message);
      return { ok: false as const, message };
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleJoinChallenge() {
    if (!authToken) {
      return { ok: false as const, message: "A JWT is needed before creating a challenge." };
    }
    setIsJoining(true);
    setStatusMessage("Initiating challenge and generating Solana Pay reference");

    try {
      const initiated = await initiateChallenge({ authToken, timezone });
      let nextPaymentUrl: string | null = null;
      try {
        nextPaymentUrl = createSolanaPayUrl({
          recipient: initiated.recipient,
          amount: initiated.amount,
          reference: initiated.reference,
          memo: initiated.memo,
        });
      } catch {
        nextPaymentUrl = null;
      }
      setPaymentReference(initiated.reference);
      setPaymentUrl(nextPaymentUrl);
      setActiveChallenge({
        id: initiated.challengeId,
        walletAddress: walletAddress ?? "",
        status: "pending_payment",
        timezone,
        referencePubkey: initiated.reference,
      });
      setCheckins([]);
      setHomeState("pending-payment");
      setStatusMessage(
        nextPaymentUrl
          ? `Challenge created. Open your Solana wallet to pay reference ${initiated.reference.slice(0, 8)}...`
          : `Challenge created, but Solana Pay URL could not be built. Check your platform wallet env.`,
      );
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "INITIATE_CHALLENGE_FAILED";
      setStatusMessage(message);
      return { ok: false as const, message };
    } finally {
      setIsJoining(false);
    }
  }

  async function pollPaymentStatus(reference: string) {
    try {
      const firstCheck = await getPaymentStatus(reference, false);
      if (firstCheck.status === "active" && authToken) {
        setPaymentReference(null);
        setPaymentUrl(null);
        setStatusMessage("Payment confirmed");
        await syncChallengeState(authToken);
        return;
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "PAYMENT_STATUS_FAILED");
    }
  }

  async function openPaymentUrl() {
    if (!paymentUrl) {
      return { ok: false as const, message: "No Solana Pay request is available yet." };
    }

    try {
      const supported = await Linking.canOpenURL(paymentUrl);
      if (!supported) {
        return { ok: false as const, message: "No wallet app is available to open the Solana Pay URL." };
      }
      await Linking.openURL(paymentUrl);
      setStatusMessage("Opened Solana wallet payment request");
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "OPEN_PAYMENT_URL_FAILED";
      setStatusMessage(message);
      return { ok: false as const, message };
    }
  }

  async function handleDemoActivatePayment() {
    if (!paymentReference || !authToken) {
      return { ok: false as const, message: "No pending payment reference available." };
    }

    try {
      const activated = await getPaymentStatus(paymentReference, true);
      if (activated.status === "active") {
        setPaymentReference(null);
        setPaymentUrl(null);
        setStatusMessage("Demo payment activation completed");
        await syncChallengeState(authToken);
        return { ok: true as const };
      }
      return { ok: false as const, message: "Payment is still pending." };
    } catch (error) {
      const message = error instanceof Error ? error.message : "DEMO_PAYMENT_ACTIVATION_FAILED";
      setStatusMessage(message);
      return { ok: false as const, message };
    }
  }

  async function handleEnableNotifications() {
    try {
      const registration = await registerForPushNotificationsAsync();
      let uploaded = false;
      if (authToken) {
        await uploadFcmToken({
          authToken,
          fcmToken: registration.devicePushToken,
        });
        uploaded = true;
      }
      await scheduleLocalCheckinReminder();
      setNotificationState({
        permissionStatus: registration.permissionStatus,
        devicePushToken: registration.devicePushToken,
        uploaded,
      });
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_NOTIFICATION_ERROR";
      setNotificationState({ error: message });
      return { ok: false as const, message };
    }
  }

  async function handleCheckin(demo = false) {
    if (!authToken || !activeChallenge) {
      return { ok: false as const, message: "No active challenge available." };
    }

    setIsCheckingIn(true);
    try {
      const response = await submitCheckin({
        authToken,
        challengeId: activeChallenge.id,
        demo,
      });
      setDayNumber(response.dayNumber);
      setStatusMessage(`Day ${response.dayNumber} check-in recorded`);
      setHomeState("checked-in");
      await syncChallengeState(authToken);
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "CHECKIN_FAILED";
      setStatusMessage(message);
      return { ok: false as const, message };
    } finally {
      setIsCheckingIn(false);
    }
  }

  return {
    authToken,
    walletAddress,
    timezone,
    activeChallenge,
    homeState,
    dayNumber,
    rewardAmount,
    history,
    checkins,
    notificationState,
    isAuthenticating,
    isJoining,
    isCheckingIn,
    paymentUrl,
    paymentReference,
    statusMessage,
    handleConnectWallet,
    handleJoinChallenge,
    handleEnableNotifications,
    handleCheckin,
    openPaymentUrl,
    handleDemoActivatePayment,
    syncChallengeState,
  };
}

export type ChallengeController = ReturnType<typeof useChallengeController>;
