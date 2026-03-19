import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { create } from "zustand";
import * as Localization from "expo-localization";
import {
  getActiveChallenges,
  getChallengeHistory,
  getPaymentStatus,
  initiateChallenge,
  requestNonce,
  updateTimezone,
  uploadFcmToken,
  verifyWallet,
  type ChallengeSummary,
} from "./src/api";
import {
  registerForPushNotificationsAsync,
  scheduleLocalCheckinReminder,
} from "./src/notifications";

type HomeState =
  | "no-active"
  | "pending-payment"
  | "active-countdown"
  | "active-window-open"
  | "checked-in"
  | "missed"
  | "completed"
  | "rewarded";

type AppState = {
  authToken: string | null;
  walletAddress: string | null;
  timezone: string;
  activeChallenge: ChallengeSummary | null;
  homeState: HomeState;
  dayNumber: number;
  rewardAmount: string;
  connectWallet: (payload: { walletAddress: string; authToken: string; timezone: string }) => void;
  setActiveChallenge: (challenge: ChallengeSummary | null) => void;
  setAuthToken: (authToken: string | null) => void;
  setHomeState: (state: HomeState) => void;
};

const useAppStore = create<AppState>((set, get) => ({
  authToken: null,
  walletAddress: null,
  timezone: Localization.getCalendars()[0]?.timeZone ?? "Asia/Manila",
  activeChallenge: null,
  homeState: "no-active",
  dayNumber: 3,
  rewardAmount: "0.22",
  connectWallet: ({ walletAddress, authToken, timezone }) =>
    set({
      walletAddress,
      authToken,
      timezone,
      homeState: "no-active",
    }),
  setActiveChallenge: (activeChallenge) => set({ activeChallenge }),
  setAuthToken: (authToken) => set({ authToken }),
  setHomeState: (homeState) => set({ homeState }),
}));

function HomeCard() {
  const { homeState, dayNumber, rewardAmount, activeChallenge } = useAppStore();

  switch (homeState) {
    case "no-active":
      return (
        <StateCard
          title="Join a 7-day challenge"
          body="Stake 0.1 SOL, wake up before 5 AM for 7 days, and earn from the weekly pool."
          accent="#0b6e4f"
        />
      );
    case "pending-payment":
      return (
        <StateCard
          title="Waiting for payment confirmation"
          body={`Challenge ${activeChallenge?.id.slice(0, 8) ?? ""} is waiting for Solana payment confirmation.`}
          accent="#a16207"
        />
      );
    case "active-countdown":
      return (
        <StateCard
          title="Next check-in in 07:14:19"
          body={`Challenge active. Your window opens at 04:59 and closes at 05:01 in ${activeChallenge?.timezone ?? "your timezone"}.`}
          accent="#1d4ed8"
        />
      );
    case "active-window-open":
      return (
        <StateCard
          title="CHECK IN NOW"
          body="The 2-minute check-in window is open. Send the request before 05:01:00."
          accent="#15803d"
        />
      );
    case "checked-in":
      return (
        <StateCard
          title={`Day ${dayNumber} checked in`}
          body="Nice work. Your streak is alive and tomorrow's reminder will be scheduled locally."
          accent="#0f766e"
        />
      );
    case "missed":
      return (
        <StateCard
          title="Today's window was missed"
          body="This challenge will settle as failed unless all required days were already completed."
          accent="#b91c1c"
        />
      );
    case "completed":
      return (
        <StateCard
          title="Challenge complete"
          body="All 7 days are done. Reward distribution happens on the next Monday at 09:00 AM PHT."
          accent="#7c3aed"
        />
      );
    case "rewarded":
      return (
        <StateCard
          title={`Reward received: ${rewardAmount} SOL`}
          body="Deposit and rewards landed. You can immediately join the next challenge."
          accent="#c2410c"
        />
      );
  }
}

function StateCard(props: { title: string; body: string; accent: string }) {
  return (
    <View style={[styles.card, { borderLeftColor: props.accent }]}>
      <Text style={styles.cardTitle}>{props.title}</Text>
      <Text style={styles.cardBody}>{props.body}</Text>
    </View>
  );
}

export default function App() {
  const {
    authToken,
    walletAddress,
    timezone,
    activeChallenge,
    connectWallet,
    setActiveChallenge,
    setHomeState,
  } = useAppStore();
  const [notificationState, setNotificationState] = useState<{
    permissionStatus?: string;
    devicePushToken?: string;
    uploaded?: boolean;
    error?: string;
  }>({});
  const [historyCount, setHistoryCount] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
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
    const [active, history] = await Promise.all([
      getActiveChallenges(token),
      getChallengeHistory(token),
    ]);

    const current = active.challenges[0] ?? null;
    setActiveChallenge(current);
    setHistoryCount(history.challenges.length);

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
      setHomeState("active-countdown");
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
    try {
      setIsAuthenticating(true);
      setStatusMessage("Requesting wallet nonce");
      const nextWalletAddress = "DemoWallet111111111111111111111111111111111";
      const timezoneToUse = Localization.getCalendars()[0]?.timeZone ?? timezone;
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "CONNECT_WALLET_FAILED";
      setStatusMessage(message);
      Alert.alert("Wallet connection failed", message);
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleJoinChallenge() {
    if (!authToken) {
      Alert.alert("Connect wallet first", "A JWT is needed before creating a challenge.");
      return;
    }

    try {
      setIsJoining(true);
      setStatusMessage("Initiating challenge and generating Solana Pay reference");
      const initiated = await initiateChallenge({
        authToken,
        timezone,
      });

      setPaymentReference(initiated.reference);
      setActiveChallenge({
        id: initiated.challengeId,
        walletAddress: walletAddress ?? "",
        status: "pending_payment",
        timezone,
        referencePubkey: initiated.reference,
      });
      setHomeState("pending-payment");
      setStatusMessage(`Challenge created. Waiting on reference ${initiated.reference.slice(0, 8)}...`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "INITIATE_CHALLENGE_FAILED";
      setStatusMessage(message);
      Alert.alert("Could not create challenge", message);
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
      const message = error instanceof Error ? error.message : "PAYMENT_STATUS_FAILED";
      setStatusMessage(message);
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_NOTIFICATION_ERROR";
      setNotificationState({ error: message });
      Alert.alert("Notification setup failed", message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>EARLY RISE CHALLENGE</Text>
          <Text style={styles.title}>Wake up early. Put 0.1 SOL on the line.</Text>
          <Text style={styles.subtitle}>
            A simple Expo MVP shell for the Solana-backed 7-day challenge.
          </Text>
        </View>

        <View style={styles.grid}>
          <HomeCard />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Wallet</Text>
            <Text style={styles.cardBody}>
              {walletAddress ?? "No wallet connected yet"}
            </Text>
            <Text style={styles.meta}>Timezone: {timezone}</Text>
            <Text style={styles.meta}>
              Auth: {authToken ? "JWT ready" : "No JWT yet"}
            </Text>
            <Text style={styles.meta}>
              Active challenge: {activeChallenge ? activeChallenge.status : "none"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardBody}>
              Android Firebase config is wired. This flow requests permission, reads a device push token, and can upload it once real wallet JWT auth is connected.
            </Text>
            <Text style={styles.meta}>
              Permission: {notificationState.permissionStatus ?? "not requested"}
            </Text>
            <Text style={styles.meta}>
              Device token: {notificationState.devicePushToken ? "captured" : "not captured"}
            </Text>
            <Text style={styles.meta}>
              Backend upload: {notificationState.uploaded ? "done" : "waiting for real JWT"}
            </Text>
            {notificationState.error ? (
              <Text style={styles.errorText}>Last error: {notificationState.error}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live MVP flow</Text>
            <Text style={styles.listItem}>Nonce and JWT auth request wired to Firebase Functions</Text>
            <Text style={styles.listItem}>Challenge initiate request and payment polling wired</Text>
            <Text style={styles.listItem}>MVP auto-activation keeps Solana UI unblocked for now</Text>
            <Text style={styles.listItem}>Challenge history count: {historyCount}</Text>
            <Text style={styles.meta}>Status: {statusMessage}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleConnectWallet}>
            <Text style={styles.primaryButtonText}>
              {isAuthenticating ? "Connecting..." : "Connect Wallet"}
            </Text>
          </TouchableOpacity>
          {isAuthenticating ? <ActivityIndicator color="#132a13" /> : null}
          <TouchableOpacity style={styles.primaryButton} onPress={handleJoinChallenge}>
            <Text style={styles.primaryButtonText}>
              {isJoining ? "Creating Challenge..." : "Join Challenge"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleEnableNotifications}>
            <Text style={styles.secondaryButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f1e8",
  },
  container: {
    padding: 24,
    gap: 20,
  },
  hero: {
    backgroundColor: "#132a13",
    borderRadius: 24,
    padding: 24,
  },
  eyebrow: {
    color: "#b7e4c7",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  title: {
    color: "#fff8e7",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    marginBottom: 12,
  },
  subtitle: {
    color: "#d8f3dc",
    fontSize: 16,
    lineHeight: 24,
  },
  grid: {
    gap: 16,
  },
  card: {
    backgroundColor: "#fffdf7",
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 6,
    borderLeftColor: "#d4d4d4",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 10,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
  },
  listItem: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
    marginBottom: 8,
  },
  meta: {
    marginTop: 10,
    color: "#6b7280",
    fontSize: 13,
  },
  errorText: {
    marginTop: 10,
    color: "#b91c1c",
    fontSize: 13,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#bc6c25",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#132a13",
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#fffdf7",
  },
  secondaryButtonText: {
    color: "#132a13",
    fontWeight: "700",
    fontSize: 16,
  },
});
