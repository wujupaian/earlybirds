import { useEffect, useState } from "react";
import * as Localization from "expo-localization";
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
    const nextWalletAddress = "DemoWallet111111111111111111111111111111111";
    const timezoneToUse = Localization.getCalendars()[0]?.timeZone ?? timezone;
    setIsAuthenticating(true);
    setStatusMessage("Requesting wallet nonce");

    try {
      const nonceResponse = await requestNonce(nextWalletAddress);
      const signature = `signed:${nonceResponse.nonce}`;
      const verified = await verifyWallet({
        walletAddress: nextWalletAddress,
        signature,
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
      setStatusMessage("Wallet connected through MVP auth flow");
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
      setPaymentReference(initiated.reference);
      setActiveChallenge({
        id: initiated.challengeId,
        walletAddress: walletAddress ?? "",
        status: "pending_payment",
        timezone,
        referencePubkey: initiated.reference,
      });
      setCheckins([]);
      setHomeState("pending-payment");
      setStatusMessage(`Challenge created. Waiting on reference ${initiated.reference.slice(0, 8)}...`);
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
        setStatusMessage("Payment confirmed");
        await syncChallengeState(authToken);
        return;
      }
      const activated = await getPaymentStatus(reference, true);
      if (activated.status === "active" && authToken) {
        setPaymentReference(null);
        setStatusMessage("MVP payment auto-confirmed");
        await syncChallengeState(authToken);
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "PAYMENT_STATUS_FAILED");
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
    statusMessage,
    handleConnectWallet,
    handleJoinChallenge,
    handleEnableNotifications,
    handleCheckin,
    syncChallengeState,
  };
}

export type ChallengeController = ReturnType<typeof useChallengeController>;

