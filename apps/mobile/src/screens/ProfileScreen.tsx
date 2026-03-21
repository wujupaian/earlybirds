import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ChallengeController } from "../useChallengeController";

function maskWallet(walletAddress: string | null) {
  if (!walletAddress) {
    return "NOT CONNECTED";
  }
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`;
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{props.label}</Text>
      <Text style={styles.infoValue}>{props.value}</Text>
    </View>
  );
}

function MetricTile(props: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.metricTile, props.accent ? styles.metricTileAccent : null]}>
      <Text style={styles.metricTileLabel}>{props.label}</Text>
      <Text style={[styles.metricTileValue, props.accent ? styles.metricTileValueAccent : null]}>{props.value}</Text>
    </View>
  );
}

export function ProfileScreen({ controller }: { controller: ChallengeController }) {
  const completed = controller.history.filter((item) => item.status === "completed" || item.status === "rewarded").length;
  const failed = controller.history.filter((item) => item.status === "failed").length;
  const total = controller.history.length;
  const winRate = total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>IDENTITY LOCK</Text>
          <Text style={styles.title}>
            THE <Text style={styles.titleAccent}>DISCIPLINED</Text> SELF
          </Text>
          <Text style={styles.subtitle}>
            Your vault identity, reminder state, and streak performance all live here.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.sectionTitle}>VAULT IDENTITY</Text>
          <InfoRow label="Wallet" value={maskWallet(controller.walletAddress)} />
          <InfoRow label="Timezone" value={controller.timezone} />
          <InfoRow
            label="Push permission"
            value={controller.notificationState.permissionStatus ?? "NOT REQUESTED"}
          />
          <InfoRow
            label="Token upload"
            value={controller.notificationState.uploaded ? "SYNCED" : "PENDING"}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricTile label="TOTAL CYCLES" value={String(total)} />
          <MetricTile label="WIN RATE" value={winRate} accent />
        </View>

        <View style={styles.metricsRow}>
          <MetricTile label="COMPLETED" value={String(completed)} />
          <MetricTile label="FAILED" value={String(failed)} />
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>COMMAND STATUS</Text>
          <Text style={styles.statusHeadline}>SYSTEM SIGNAL</Text>
          <Text style={styles.statusMessage}>{controller.statusMessage}</Text>
          <Text style={styles.statusFootnote}>
            This feed reflects the latest local app action, including auth, payment polling, notification sync, and check-in results.
          </Text>
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
    paddingTop: 16,
    paddingBottom: 32,
    gap: 14,
  },
  heroCard: {
    backgroundColor: "#141415",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#212122",
  },
  eyebrow: {
    color: "#f2b53c",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: {
    color: "#f5efe3",
    fontSize: 38,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  titleAccent: {
    color: "#ffd361",
  },
  subtitle: {
    color: "#a59a84",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  profileCard: {
    backgroundColor: "#151516",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#232324",
  },
  sectionTitle: {
    color: "#ffd361",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.7,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#232324",
    gap: 12,
  },
  infoLabel: {
    color: "#8d8473",
    fontSize: 13,
  },
  infoValue: {
    color: "#f5efe3",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    flexShrink: 1,
    textAlign: "right",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricTile: {
    flex: 1,
    backgroundColor: "#151516",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#232324",
  },
  metricTileAccent: {
    backgroundColor: "#241d11",
    borderColor: "#6e5414",
  },
  metricTileLabel: {
    color: "#8d8473",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  metricTileValue: {
    color: "#f5efe3",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 10,
  },
  metricTileValueAccent: {
    color: "#ffd361",
  },
  statusCard: {
    backgroundColor: "#141415",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#232324",
  },
  statusHeadline: {
    color: "#f5efe3",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 12,
  },
  statusMessage: {
    color: "#f0d287",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "700",
  },
  statusFootnote: {
    color: "#a59a84",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },
});
