import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CheckinRecord } from "../api";
import type { ChallengeController } from "../useChallengeController";

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : "TBD";
}

function CheckinRow({ item }: { item: CheckinRecord }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>Day {item.dayNumber}</Text>
      <Text style={styles.rowMeta}>{item.checkedIn ? "Checked in" : "Pending"} - {item.checkDate}</Text>
      <Text style={styles.rowMeta}>{item.checkedInAt ? formatDateTime(item.checkedInAt) : "No check-in yet"}</Text>
    </View>
  );
}

export function ChallengeDetailScreen({ controller }: { controller: ChallengeController }) {
  const challenge = controller.activeChallenge;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Challenge</Text>
          <Text style={styles.cardBody}>
            {challenge ? `Challenge ${challenge.id.slice(0, 8)} in ${challenge.timezone}` : "No active challenge right now."}
          </Text>
          <Text style={styles.meta}>Status: {challenge?.status ?? "none"}</Text>
          <Text style={styles.meta}>Start: {formatDateTime(challenge?.startTime)}</Text>
          <Text style={styles.meta}>End: {formatDateTime(challenge?.endTime)}</Text>
          <Text style={styles.meta}>Current day: {controller.dayNumber}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>7-Day Progress</Text>
          {controller.checkins.length > 0 ? (
            controller.checkins.map((item) => <CheckinRow key={item.id} item={item} />)
          ) : (
            <Text style={styles.cardBody}>Check-ins will appear here once the challenge is active.</Text>
          )}
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
    borderLeftColor: "#1d4ed8",
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
  row: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ece7dd",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  rowMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
});

