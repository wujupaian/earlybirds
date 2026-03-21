import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ChallengeSummary } from "../api";
import type { ChallengeController } from "../useChallengeController";

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : "TBD";
}

function getStatusTone(status: string) {
  switch (status) {
    case "rewarded":
      return styles.statusRewarded;
    case "completed":
      return styles.statusCompleted;
    case "failed":
      return styles.statusFailed;
    case "active":
      return styles.statusActive;
    case "pending_payment":
      return styles.statusPending;
    default:
      return null;
  }
}

function getYield(item: ChallengeSummary) {
  return item.rewardAmount ? `${item.rewardAmount.toFixed(2)} SOL` : item.status === "failed" ? "0.00 SOL" : "0.10 SOL";
}

function HistoryCycle({ item }: { item: ChallengeSummary }) {
  return (
    <View style={styles.cycleCard}>
      <View style={styles.cycleHeader}>
        <View>
          <Text style={styles.cycleLabel}>CYCLE</Text>
          <Text style={styles.cycleTitle}>{item.id.slice(0, 8).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusPill, getStatusTone(item.status)]}>
          <Text style={styles.statusText}>{item.status.replaceAll("_", " ").toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.yieldRow}>
        <Text style={styles.yieldLabel}>REALIZED YIELD</Text>
        <Text style={styles.yieldValue}>{getYield(item)}</Text>
      </View>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLine}>Start: {item.startTime ? formatDateTime(item.startTime) : "Not started"}</Text>
        <Text style={styles.metaLine}>End: {item.endTime ? formatDateTime(item.endTime) : "TBD"}</Text>
        <Text style={styles.metaLine}>Timezone: {item.timezone}</Text>
      </View>
    </View>
  );
}

export function HistoryScreen({ controller }: { controller: ChallengeController }) {
  const rewarded = controller.history.filter((item) => item.status === "rewarded").length;
  const completed = controller.history.filter((item) => item.status === "completed").length;
  const failed = controller.history.filter((item) => item.status === "failed").length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>ARCHIVE OF DISCIPLINE</Text>
          <Text style={styles.title}>
            EVERY <Text style={styles.titleAccent}>CYCLE</Text> LEAVES A TRACE
          </Text>
          <Text style={styles.subtitle}>
            Review your past seven-day runs, payout outcomes, and the weeks that hardened the streak.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryLabel}>REWARDED</Text>
            <Text style={styles.summaryValue}>{rewarded}</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryLabel}>COMPLETED</Text>
            <Text style={styles.summaryValue}>{completed}</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryLabel}>FAILED</Text>
            <Text style={styles.summaryValue}>{failed}</Text>
          </View>
        </View>

        {controller.history.length > 0 ? (
          controller.history.map((item) => <HistoryCycle key={item.id} item={item} />)
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>NO CYCLES YET</Text>
            <Text style={styles.emptyBody}>Once you enter the vault, your completed and failed weeks will appear here.</Text>
          </View>
        )}
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
  hero: {
    paddingHorizontal: 4,
    gap: 10,
  },
  eyebrow: {
    color: "#f2b53c",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
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
  },
  summaryCard: {
    flexDirection: "row",
    gap: 10,
  },
  summaryMetric: {
    flex: 1,
    backgroundColor: "#151516",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#232324",
  },
  summaryLabel: {
    color: "#8d8473",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  summaryValue: {
    color: "#f5efe3",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
  },
  cycleCard: {
    backgroundColor: "#141415",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#212122",
    gap: 16,
  },
  cycleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cycleLabel: {
    color: "#8d8473",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  cycleTitle: {
    color: "#f5efe3",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#232324",
  },
  statusRewarded: {
    backgroundColor: "#31250e",
  },
  statusCompleted: {
    backgroundColor: "#2b2217",
  },
  statusFailed: {
    backgroundColor: "#35201f",
  },
  statusActive: {
    backgroundColor: "#25251f",
  },
  statusPending: {
    backgroundColor: "#292522",
  },
  statusText: {
    color: "#f8d371",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  yieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    paddingTop: 4,
  },
  yieldLabel: {
    color: "#8d8473",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  yieldValue: {
    color: "#ffd361",
    fontSize: 20,
    fontWeight: "900",
  },
  metaBlock: {
    borderTopWidth: 1,
    borderTopColor: "#232324",
    paddingTop: 14,
    gap: 8,
  },
  metaLine: {
    color: "#b8ae9b",
    fontSize: 13,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: "#141415",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#212122",
  },
  emptyTitle: {
    color: "#f5efe3",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  emptyBody: {
    color: "#a59a84",
    fontSize: 14,
    lineHeight: 22,
  },
});
