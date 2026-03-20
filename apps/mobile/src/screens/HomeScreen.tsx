import React from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { ChallengeController } from "../useChallengeController";

function StateCard(props: { title: string; body: string; accent: string }) {
  return (
    <View style={[styles.card, { borderLeftColor: props.accent }]}>
      <Text style={styles.cardTitle}>{props.title}</Text>
      <Text style={styles.cardBody}>{props.body}</Text>
    </View>
  );
}

function HomeStateCard({ controller }: { controller: ChallengeController }) {
  const { homeState, dayNumber, rewardAmount, activeChallenge } = controller;

  switch (homeState) {
    case "no-active":
      return <StateCard title="Join a 7-day challenge" body="Stake 0.1 SOL, wake up before 5 AM for 7 days, and earn from the weekly pool." accent="#0b6e4f" />;
    case "pending-payment":
      return <StateCard title="Waiting for payment confirmation" body={`Challenge ${activeChallenge?.id.slice(0, 8) ?? ""} is waiting for Solana payment confirmation.`} accent="#a16207" />;
    case "active-countdown":
      return <StateCard title="Challenge active" body={`Your window opens at 04:59 and closes at 05:01 in ${activeChallenge?.timezone ?? "your timezone"}.`} accent="#1d4ed8" />;
    case "active-window-open":
      return <StateCard title="CHECK IN NOW" body="The 2-minute check-in window is open. Send the request before 05:01:00." accent="#15803d" />;
    case "checked-in":
      return <StateCard title={`Day ${dayNumber} checked in`} body="Nice work. Your streak is alive and tomorrow's reminder will be scheduled locally." accent="#0f766e" />;
    case "missed":
      return <StateCard title="Today's window was missed" body="This challenge will settle as failed unless all required days were already completed." accent="#b91c1c" />;
    case "completed":
      return <StateCard title="Challenge complete" body="All 7 days are done. Reward distribution happens on the next Monday at 09:00 AM PHT." accent="#7c3aed" />;
    case "rewarded":
      return <StateCard title={`Reward received: ${rewardAmount} SOL`} body="Deposit and rewards landed. You can immediately join the next challenge." accent="#c2410c" />;
  }
}

export function HomeScreen({ controller }: { controller: ChallengeController }) {
  async function onConnectWallet() {
    const result = await controller.handleConnectWallet();
    if (!result.ok) {
      Alert.alert("Wallet connection failed", result.message);
    }
  }

  async function onJoinChallenge() {
    const result = await controller.handleJoinChallenge();
    if (!result.ok) {
      Alert.alert("Could not create challenge", result.message);
    }
  }

  async function onEnableNotifications() {
    const result = await controller.handleEnableNotifications();
    if (!result.ok) {
      Alert.alert("Notification setup failed", result.message);
    }
  }

  async function onCheckin(demo = false) {
    const result = await controller.handleCheckin(demo);
    if (!result.ok) {
      Alert.alert("Check-in failed", result.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>EARLY RISE CHALLENGE</Text>
          <Text style={styles.title}>Wake up early. Put 0.1 SOL on the line.</Text>
          <Text style={styles.subtitle}>This home screen now focuses on the daily loop: connect, join, activate, and check in.</Text>
        </View>

        <HomeStateCard controller={controller} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live status</Text>
          <Text style={styles.cardBody}>Wallet: {controller.walletAddress ?? "Not connected"}</Text>
          <Text style={styles.meta}>Timezone: {controller.timezone}</Text>
          <Text style={styles.meta}>Active challenge: {controller.activeChallenge?.status ?? "none"}</Text>
          <Text style={styles.meta}>Status: {controller.statusMessage}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => void onConnectWallet()}>
            <Text style={styles.primaryButtonText}>{controller.isAuthenticating ? "Connecting..." : "Connect Wallet"}</Text>
          </TouchableOpacity>
          {controller.isAuthenticating ? <ActivityIndicator color="#132a13" /> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={() => void onJoinChallenge()}>
            <Text style={styles.primaryButtonText}>{controller.isJoining ? "Creating Challenge..." : "Join Challenge"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => void onCheckin(false)}>
            <Text style={styles.secondaryButtonText}>{controller.isCheckingIn ? "Checking In..." : "Real Check-In"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => void onCheckin(true)}>
            <Text style={styles.secondaryButtonText}>Demo Check-In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => void onEnableNotifications()}>
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
    padding: 20,
    gap: 16,
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
  card: {
    backgroundColor: "#fffdf7",
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 6,
    borderLeftColor: "#d4d4d4",
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
  meta: {
    marginTop: 10,
    color: "#6b7280",
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

