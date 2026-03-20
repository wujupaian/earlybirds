import React from "react";
import {
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ChallengeController } from "../useChallengeController";

export function ProfileScreen({ controller }: { controller: ChallengeController }) {
  const completed = controller.history.filter((item) => item.status === "completed" || item.status === "rewarded").length;
  const failed = controller.history.filter((item) => item.status === "failed").length;
  const total = controller.history.length;
  const winRate = total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%";

  async function onLoadBatches() {
    const result = await controller.loadAdminRewardBatches();
    if (!result.ok) {
      Alert.alert("Load failed", result.message);
    }
  }

  async function onSelectBatch(batchId: string) {
    const result = await controller.loadManualPreview(batchId);
    if (!result.ok) {
      Alert.alert("Preview failed", result.message);
    }
  }

  async function onMarkDistributed() {
    const result = await controller.markSelectedBatchDistributed();
    if (!result.ok) {
      Alert.alert("Mark distributed failed", result.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardBody}>Wallet: {controller.walletAddress ?? "Not connected"}</Text>
          <Text style={styles.meta}>Timezone: {controller.timezone}</Text>
          <Text style={styles.meta}>Notification permission: {controller.notificationState.permissionStatus ?? "not requested"}</Text>
          <Text style={styles.meta}>Backend token upload: {controller.notificationState.uploaded ? "done" : "not yet"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stats</Text>
          <Text style={styles.cardBody}>Total challenges: {total}</Text>
          <Text style={styles.meta}>Completed or rewarded: {completed}</Text>
          <Text style={styles.meta}>Failed: {failed}</Text>
          <Text style={styles.meta}>Win rate: {winRate}</Text>
          <Text style={styles.meta}>Status: {controller.statusMessage}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Admin Payouts</Text>
          <Text style={styles.cardBody}>
            Load reward batches, tap one, then review the manual payout list here before sending funds yourself.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => void onLoadBatches()}>
            <Text style={styles.buttonText}>
              {controller.isLoadingAdmin ? "Loading..." : "Load Reward Batches"}
            </Text>
          </TouchableOpacity>

          {controller.rewardBatches.map((batch) => (
            <TouchableOpacity
              key={batch.id}
              style={styles.batchRow}
              onPress={() => void onSelectBatch(batch.id)}
            >
              <Text style={styles.batchTitle}>
                {batch.id.slice(0, 8)} - {batch.status}
              </Text>
              <Text style={styles.meta}>
                Winners: {batch.successCount} | Failures: {batch.failedCount}
              </Text>
              <Text style={styles.meta}>
                Reward/user: {batch.rewardPerUserSol} SOL
              </Text>
            </TouchableOpacity>
          ))}

          {controller.selectedBatch ? (
            <View style={styles.previewBox}>
              <Text style={styles.cardTitle}>Selected Batch</Text>
              <Text style={styles.cardBody}>
                Batch {controller.selectedBatch.id.slice(0, 8)} - {controller.selectedBatch.status}
              </Text>
              <Text style={styles.meta}>
                Pool: {controller.selectedBatch.rewardPoolSol} SOL
              </Text>
              <Text style={styles.meta}>
                Per winner: {controller.selectedBatch.rewardPerUserSol} SOL
              </Text>
              {controller.manualRecipients.length > 0 ? (
                controller.manualRecipients.map((recipient) => (
                  <View key={recipient.challengeId} style={styles.recipientRow}>
                    <Text style={styles.recipientTitle}>{recipient.walletAddress}</Text>
                    <Text style={styles.meta}>
                      {recipient.rewardAmountSol} SOL
                    </Text>
                    <Text style={styles.meta}>
                      Challenge {recipient.challengeId.slice(0, 8)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.meta}>No recipients in this batch.</Text>
              )}

              <TouchableOpacity style={styles.button} onPress={() => void onMarkDistributed()}>
                <Text style={styles.buttonText}>Mark Batch Distributed</Text>
              </TouchableOpacity>
            </View>
          ) : null}
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
  card: {
    backgroundColor: "#fffdf7",
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 6,
    borderLeftColor: "#0f766e",
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
  button: {
    marginTop: 16,
    backgroundColor: "#bc6c25",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  batchRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#ece7dd",
  },
  batchTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  previewBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#d9d3c7",
  },
  recipientRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ece7dd",
  },
  recipientTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
});
