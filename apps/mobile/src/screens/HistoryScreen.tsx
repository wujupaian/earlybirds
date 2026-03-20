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

function HistoryRow({ item }: { item: ChallengeSummary }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{item.id.slice(0, 8)}</Text>
      <Text style={styles.rowMeta}>Status: {item.status}</Text>
      <Text style={styles.rowMeta}>
        {item.startTime ? formatDateTime(item.startTime) : "Not started"} to {item.endTime ? formatDateTime(item.endTime) : "TBD"}
      </Text>
    </View>
  );
}

export function HistoryScreen({ controller }: { controller: ChallengeController }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Challenge History</Text>
          <Text style={styles.cardBody}>Every challenge created by the connected wallet appears here.</Text>
          {controller.history.length > 0 ? (
            controller.history.map((item) => <HistoryRow key={item.id} item={item} />)
          ) : (
            <Text style={styles.emptyText}>No history yet.</Text>
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
  },
  card: {
    backgroundColor: "#fffdf7",
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 6,
    borderLeftColor: "#7c3aed",
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
  emptyText: {
    marginTop: 12,
    color: "#6b7280",
  },
});

