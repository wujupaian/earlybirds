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

function formatWallet(walletAddress: string | null) {
  if (!walletAddress) {
    return "WALLET NOT CONNECTED";
  }
  return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
}

function getHeroTitle(homeState: ChallengeController["homeState"]) {
  switch (homeState) {
    case "pending-payment":
      return "ENTER THE VAULT";
    case "active-window-open":
      return "CHECK IN NOW";
    case "checked-in":
      return "DISCIPLINE LOGGED";
    case "completed":
      return "CYCLE COMPLETE";
    case "rewarded":
      return "THE DISCIPLINED WIN";
    case "missed":
      return "WINDOW MISSED";
    case "active-countdown":
      return "COUNTDOWN TO DAWN";
    case "no-active":
    default:
      return "PUT YOUR MONEY WHERE YOUR ALARM CLOCK IS";
  }
}

function getHeroBody(controller: ChallengeController) {
  switch (controller.homeState) {
    case "pending-payment":
      return "The covenant is drafted. Open your Solana wallet and send the 0.1 SOL stake to activate this seven-day rise sequence.";
    case "active-window-open":
      return "The two-minute gate is open. Get the request to the server before 05:01:00 in your locked challenge timezone.";
    case "checked-in":
      return `Day ${controller.dayNumber} is sealed. Hold the rhythm and return tomorrow before dawn.`;
    case "completed":
      return "Seven clean mornings completed. Your reward batch will settle on the next Monday distribution cycle.";
    case "rewarded":
      return `Yield landed. Current realized return: ${controller.rewardAmount} SOL.`;
    case "missed":
      return "This cycle slipped. Review the streak, regroup, and enter the next phase with a new stake.";
    case "active-countdown":
      return "Your challenge is active. The only thing that matters now is hitting the 04:59 to 05:01 server-validated window.";
    case "no-active":
    default:
      return "Stake 0.1 SOL, rise between 4:59 and 5:01 AM for 7 days, and win a share of the pool. Miss once, lose your stake.";
  }
}

function getPrimaryActionLabel(controller: ChallengeController) {
  if (!controller.walletAddress) {
    return controller.isAuthenticating ? "CONNECTING..." : "CONNECT WALLET";
  }

  if (controller.homeState === "pending-payment") {
    return "OPEN WALLET PAYMENT";
  }

  if (controller.homeState === "active-window-open" || controller.homeState === "active-countdown" || controller.homeState === "checked-in") {
    return controller.isCheckingIn ? "CHECKING IN..." : "CHECK IN NOW";
  }

  return controller.isJoining ? "PREPARING STAKE..." : "STAKE 0.1 SOL TO ENTER";
}

function getPrimaryActionHandler(controller: ChallengeController) {
  if (!controller.walletAddress) {
    return "connect" as const;
  }

  if (controller.homeState === "pending-payment") {
    return "payment" as const;
  }

  if (controller.homeState === "active-window-open" || controller.homeState === "active-countdown" || controller.homeState === "checked-in") {
    return "checkin" as const;
  }

  return "join" as const;
}

function getStatusPill(controller: ChallengeController) {
  switch (controller.homeState) {
    case "pending-payment":
      return "PAYMENT PENDING";
    case "active-window-open":
      return "ACTIVE CHECK-IN";
    case "checked-in":
      return `DAY ${controller.dayNumber} LOGGED`;
    case "completed":
      return "AWAITING PAYOUT";
    case "rewarded":
      return "REWARDED";
    case "missed":
      return "STREAK BROKEN";
    case "active-countdown":
      return "ACTIVE CYCLE";
    case "no-active":
    default:
      return "OBSIDIAN DAWN";
  }
}

function MetricCard(props: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={[styles.metricCard, props.emphasis ? styles.metricCardEmphasis : null]}>
      <Text style={styles.metricLabel}>{props.label}</Text>
      <Text style={[styles.metricValue, props.emphasis ? styles.metricValueEmphasis : null]}>{props.value}</Text>
    </View>
  );
}

function UtilityRow(props: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <View style={styles.utilityRow}>
      <Text style={styles.utilityLabel}>{props.label}</Text>
      <Text
        style={[
          styles.utilityValue,
          props.tone === "success" ? styles.utilityValueSuccess : null,
          props.tone === "warning" ? styles.utilityValueWarning : null,
        ]}
      >
        {props.value}
      </Text>
    </View>
  );
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

  async function onOpenPayment() {
    const result = await controller.openPaymentUrl();
    if (!result.ok) {
      Alert.alert("Could not open wallet", result.message);
    }
  }

  async function onDemoActivate() {
    const result = await controller.handleDemoActivatePayment();
    if (!result.ok) {
      Alert.alert("Demo activation failed", result.message);
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

  async function onPrimaryPress() {
    const action = getPrimaryActionHandler(controller);

    if (action === "connect") {
      await onConnectWallet();
      return;
    }

    if (action === "payment") {
      await onOpenPayment();
      return;
    }

    if (action === "checkin") {
      await onCheckin(false);
      return;
    }

    await onJoinChallenge();
  }

  const completedCount = controller.checkins.filter((item) => item.checkedIn).length;
  const streakRatio = `${completedCount}/7`;
  const paymentReady = controller.paymentUrl ? "READY" : "NOT READY";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.brand}>OBSIDIAN DAWN</Text>
            <View style={styles.walletBadge}>
              <Text style={styles.walletBadgeText}>{formatWallet(controller.walletAddress)}</Text>
            </View>
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{getStatusPill(controller)}</Text>
          </View>

          <Text style={styles.heroTitle}>{getHeroTitle(controller.homeState)}</Text>
          <Text style={styles.heroBody}>{getHeroBody(controller)}</Text>

          <View style={styles.stakeCard}>
            <View style={styles.stakeAccent} />
            <View style={styles.stakeContent}>
              <Text style={styles.stakeLabel}>REQUIRED STAKE</Text>
              <Text style={styles.stakeValue}>0.1</Text>
              <Text style={styles.stakeUnit}>SOL</Text>
            </View>
          </View>

          <View style={styles.heroMetrics}>
            <MetricCard label="WINDOW" value="04:59 - 05:01" />
            <MetricCard label="STREAK" value={streakRatio} emphasis />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => void onPrimaryPress()}>
            <Text style={styles.primaryButtonText}>{getPrimaryActionLabel(controller)}</Text>
          </TouchableOpacity>

          {(controller.isAuthenticating || controller.isJoining || controller.isCheckingIn) ? (
            <ActivityIndicator color="#0d0d0e" style={styles.spinner} />
          ) : null}

          <Text style={styles.helperText}>{controller.statusMessage}</Text>
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>LIVE COMMAND</Text>
          <UtilityRow label="Timezone" value={controller.timezone} />
          <UtilityRow label="Challenge status" value={controller.activeChallenge?.status ?? "NONE"} />
          <UtilityRow label="Payment route" value={paymentReady} tone={controller.paymentUrl ? "success" : "warning"} />
          <UtilityRow
            label="Push permission"
            value={controller.notificationState.permissionStatus ?? "NOT REQUESTED"}
          />
          <UtilityRow
            label="Token upload"
            value={controller.notificationState.uploaded ? "SYNCED" : "PENDING"}
            tone={controller.notificationState.uploaded ? "success" : "warning"}
          />
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>COVENANT</Text>
          <Text style={styles.ruleLine}>7 consecutive mornings</Text>
          <Text style={styles.ruleLine}>Server time is law, not device time</Text>
          <Text style={styles.ruleLine}>One miss routes the stake into the pool</Text>
        </View>

        <View style={styles.utilityActions}>
          <TouchableOpacity style={styles.utilityButton} onPress={() => void onEnableNotifications()}>
            <Text style={styles.utilityButtonText}>ENABLE REMINDERS</Text>
          </TouchableOpacity>

          {controller.paymentReference ? (
            <TouchableOpacity style={styles.utilityButton} onPress={() => void onDemoActivate()}>
              <Text style={styles.utilityButtonText}>DEMO ACTIVATE PAYMENT</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.utilityButton} onPress={() => void onCheckin(true)}>
            <Text style={styles.utilityButtonText}>DEMO CHECK-IN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0b0c",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },
  heroCard: {
    backgroundColor: "#121213",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e1b16",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  brand: {
    color: "#f4b000",
    fontSize: 11,
    letterSpacing: 2.1,
    fontWeight: "800",
  },
  walletBadge: {
    backgroundColor: "#211f1b",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#2d2820",
  },
  walletBadgeText: {
    color: "#f3ead0",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#1d1a14",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 18,
  },
  statusPillText: {
    color: "#ffcf54",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: "#f3eee3",
    fontSize: 42,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -1.4,
    marginBottom: 14,
  },
  heroBody: {
    color: "#b8ae9a",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
  },
  stakeCard: {
    flexDirection: "row",
    backgroundColor: "#161617",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  stakeAccent: {
    width: 4,
    backgroundColor: "#f4b000",
  },
  stakeContent: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  stakeLabel: {
    color: "#ffcf54",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  stakeValue: {
    color: "#f6f0e4",
    fontSize: 38,
    lineHeight: 38,
    fontWeight: "900",
  },
  stakeUnit: {
    color: "#c6b79c",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  heroMetrics: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#19191a",
    borderRadius: 18,
    padding: 14,
  },
  metricCardEmphasis: {
    backgroundColor: "#1f1a10",
  },
  metricLabel: {
    color: "#8e8574",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  metricValue: {
    color: "#f5efe3",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 22,
  },
  metricValueEmphasis: {
    color: "#ffcb48",
  },
  primaryButton: {
    backgroundColor: "#ffd361",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f5b000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  primaryButtonText: {
    color: "#15130f",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  spinner: {
    marginTop: 14,
  },
  helperText: {
    color: "#8f8677",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: "center",
  },
  panelCard: {
    backgroundColor: "#151516",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1d1c19",
  },
  panelTitle: {
    color: "#f5efe3",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.7,
    marginBottom: 14,
  },
  utilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f1f20",
  },
  utilityLabel: {
    color: "#8c8475",
    fontSize: 13,
  },
  utilityValue: {
    color: "#f1ead8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  utilityValueSuccess: {
    color: "#f7c64b",
  },
  utilityValueWarning: {
    color: "#cf8f4f",
  },
  ruleLine: {
    color: "#b3a995",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  utilityActions: {
    gap: 10,
  },
  utilityButton: {
    backgroundColor: "#121213",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2c261e",
  },
  utilityButtonText: {
    color: "#f5d071",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
});
