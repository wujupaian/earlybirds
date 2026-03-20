import React from "react";
import {
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
});
