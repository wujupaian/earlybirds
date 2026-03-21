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

function formatSol(value?: number) {
  return value ? `${value.toFixed(2)} SOL` : "0.10 SOL";
}

function getCurrentPhase(controller: ChallengeController) {
  if (controller.activeChallenge?.status === "pending_payment") {
    return "00";
  }
  return String(Math.min(7, Math.max(1, controller.dayNumber))).padStart(2, "0");
}

function getEstimatedShare(controller: ChallengeController) {
  if (controller.activeChallenge?.rewardAmount) {
    return formatSol(controller.activeChallenge.rewardAmount);
  }
  return controller.homeState === "completed" || controller.homeState === "rewarded" ? "0.18 SOL" : "0.10 SOL";
}

function getChallengeStatusCopy(controller: ChallengeController) {
  switch (controller.activeChallenge?.status) {
    case "pending_payment":
      return "Waiting for stake settlement";
    case "active":
      return "Live challenge";
    case "completed":
      return "Completed and queued";
    case "rewarded":
      return "Reward settled";
    case "failed":
      return "Cycle failed";
    default:
      return "No live challenge";
  }
}

function DayTile(props: {
  dayNumber: number;
  checkin?: CheckinRecord;
  activeDay: number;
}) {
  const checkedIn = props.checkin?.checkedIn ?? false;
  const isActive = props.dayNumber === props.activeDay;
  const isLocked = !props.checkin && props.dayNumber > props.activeDay;

  return (
    <View
      style={[
        styles.dayTile,
        checkedIn ? styles.dayTileDone : null,
        isActive ? styles.dayTileActive : null,
        isLocked ? styles.dayTileLocked : null,
      ]}
    >
      {isActive && !checkedIn ? (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>ACTIVE</Text>
        </View>
      ) : null}
      <Text
        style={[
          styles.dayLabel,
          checkedIn ? styles.dayLabelDone : null,
          isActive ? styles.dayLabelActive : null,
        ]}
      >
        {`DAY ${String(props.dayNumber).padStart(2, "0")}`}
      </Text>
      <View
        style={[
          styles.dayCircle,
          checkedIn ? styles.dayCircleDone : null,
          isActive ? styles.dayCircleActive : null,
          isLocked ? styles.dayCircleLocked : null,
        ]}
      >
        <Text
          style={[
            styles.dayCircleText,
            checkedIn ? styles.dayCircleTextDone : null,
            isLocked ? styles.dayCircleTextLocked : null,
          ]}
        >
          {checkedIn ? "✓" : isLocked ? "LOCK" : "•"}
        </Text>
      </View>
      <Text style={styles.dayMeta}>
        {checkedIn ? "LOGGED" : props.checkin ? props.checkin.checkDate : "UPCOMING"}
      </Text>
    </View>
  );
}

function StatChip(props: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <View style={styles.statChipIcon} />
      <View>
        <Text style={styles.statChipLabel}>{props.label}</Text>
        <Text style={styles.statChipValue}>{props.value}</Text>
      </View>
    </View>
  );
}

export function ChallengeDetailScreen({ controller }: { controller: ChallengeController }) {
  const challenge = controller.activeChallenge;
  const completedCount = controller.checkins.filter((item) => item.checkedIn).length;
  const activeDay = Math.min(7, Math.max(1, completedCount + (challenge?.status === "active" && completedCount < 7 ? 1 : 0)));
  const estimatedShare = getEstimatedShare(controller);
  const dailyDiscipline = `${Math.round((completedCount / 7) * 100) || 0}%`;
  const days = Array.from({ length: 7 }, (_, index) => index + 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.eyebrow}>THE EARLY RISE CHALLENGE</Text>
          <Text style={styles.heroTitle}>
            PHASE <Text style={styles.heroAccent}>{getCurrentPhase(controller)}</Text>
          </Text>
        </View>

        <View style={styles.poolCard}>
          <View style={styles.poolHeader}>
            <View>
              <Text style={styles.poolLabel}>CURRENT POOL</Text>
              <Text style={styles.poolValue}>
                12.4 <Text style={styles.poolUnit}>SOL</Text>
              </Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE DATA</Text>
            </View>
          </View>

          <View style={styles.shareSection}>
            <View style={styles.shareRow}>
              <Text style={styles.shareLabel}>YOUR ESTIMATED SHARE</Text>
              <Text style={styles.shareValue}>{estimatedShare}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(15, (completedCount / 7) * 100)}%` }]} />
            </View>
          </View>

          <View style={styles.poolFooter}>
            <Text style={styles.poolFooterText}>482 PARTICIPANTS</Text>
            <Text style={styles.poolFooterText}>
              {challenge?.status === "active" ? `${7 - completedCount} DAYS REMAINING` : "7 DAY CYCLE"}
            </Text>
          </View>
        </View>

        <View style={styles.countdownCard}>
          <View>
            <Text style={styles.countdownLabel}>NEXT WINDOW</Text>
            <Text style={styles.countdownValue}>
              {challenge?.status === "active" ? "05:42:12" : "04:59:00"}
            </Text>
            <Text style={styles.countdownMeta}>
              {challenge?.status === "active" ? "Until tomorrow's check-in." : "Window opens once the challenge is active."}
            </Text>
          </View>

          <View style={styles.disciplineBlock}>
            <View style={styles.disciplineHeader}>
              <Text style={styles.disciplineLabel}>DAILY DISCIPLINE</Text>
              <Text style={styles.disciplineValue}>{dailyDiscipline}</Text>
            </View>
            <View style={styles.ringShell}>
              <View style={styles.ringOuter}>
                <View style={styles.ringInner}>
                  <Text style={styles.ringGlyph}>◐</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>WEEKLY JOURNEY</Text>
          <Text style={styles.sectionMeta}>CURRENT STREAK: {completedCount} DAYS</Text>
        </View>

        <View style={styles.daysGrid}>
          {days.map((dayNumber) => (
            <DayTile
              key={dayNumber}
              dayNumber={dayNumber}
              checkin={controller.checkins.find((item) => item.dayNumber === dayNumber)}
              activeDay={activeDay}
            />
          ))}
        </View>

        <View style={styles.statsRow}>
          <StatChip label="GLOBAL AVG." value="05:14 AM" />
          <StatChip label="SURVIVAL RATE" value={challenge?.status === "failed" ? "0%" : "64.2%"} />
          <StatChip label="NETWORK LOAD" value="LOW" />
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>VAULT DETAIL</Text>
          <Text style={styles.detailsLine}>Status: {getChallengeStatusCopy(controller)}</Text>
          <Text style={styles.detailsLine}>Challenge ID: {challenge ? challenge.id.slice(0, 8) : "NONE"}</Text>
          <Text style={styles.detailsLine}>Timezone lock: {challenge?.timezone ?? controller.timezone}</Text>
          <Text style={styles.detailsLine}>Start: {formatDateTime(challenge?.startTime)}</Text>
          <Text style={styles.detailsLine}>End: {formatDateTime(challenge?.endTime)}</Text>
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
    gap: 16,
  },
  heroSection: {
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  eyebrow: {
    color: "#f1b400",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#f5efe3",
    fontSize: 46,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: -1.6,
  },
  heroAccent: {
    color: "#f7c23d",
  },
  poolCard: {
    backgroundColor: "#141415",
    borderRadius: 28,
    padding: 20,
    borderLeftWidth: 1,
    borderLeftColor: "#624b10",
    overflow: "hidden",
  },
  poolHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  poolLabel: {
    color: "#9e947f",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.7,
    marginBottom: 10,
  },
  poolValue: {
    color: "#f5efe3",
    fontSize: 42,
    lineHeight: 42,
    fontWeight: "900",
  },
  poolUnit: {
    color: "#ffd361",
    fontSize: 22,
  },
  livePill: {
    backgroundColor: "#1c1c1d",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#272728",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#ffd361",
  },
  liveText: {
    color: "#ffd361",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  shareSection: {
    marginTop: 28,
    gap: 10,
  },
  shareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  shareLabel: {
    color: "#9e947f",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  shareValue: {
    color: "#ffd361",
    fontSize: 16,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#242425",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#ffcf58",
  },
  poolFooter: {
    marginTop: 22,
    flexDirection: "row",
    gap: 18,
    flexWrap: "wrap",
  },
  poolFooterText: {
    color: "#6f685b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  countdownCard: {
    backgroundColor: "#1a1a1b",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#252526",
    gap: 22,
  },
  countdownLabel: {
    color: "#ffd361",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.7,
  },
  countdownValue: {
    color: "#f5efe3",
    fontSize: 40,
    lineHeight: 40,
    fontWeight: "900",
    marginTop: 14,
  },
  countdownMeta: {
    color: "#9a9180",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  disciplineBlock: {
    borderTopWidth: 1,
    borderTopColor: "#262627",
    paddingTop: 18,
  },
  disciplineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  disciplineLabel: {
    color: "#9e947f",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  disciplineValue: {
    color: "#ffd361",
    fontSize: 12,
    fontWeight: "800",
  },
  ringShell: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringOuter: {
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 6,
    borderColor: "#f29f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#141415",
    alignItems: "center",
    justifyContent: "center",
  },
  ringGlyph: {
    color: "#f29f1f",
    fontSize: 26,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: "#f5efe3",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  sectionMeta: {
    color: "#ffd361",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dayTile: {
    width: "30%",
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: "#151516",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#242425",
  },
  dayTileDone: {
    backgroundColor: "#211b0f",
    borderColor: "#735811",
  },
  dayTileActive: {
    backgroundColor: "#282119",
    borderColor: "#f0b739",
  },
  dayTileLocked: {
    opacity: 0.45,
  },
  activeBadge: {
    position: "absolute",
    top: -8,
    backgroundColor: "#ffd361",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    color: "#22180a",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  dayLabel: {
    color: "#7e7668",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  dayLabelDone: {
    color: "#d8aa30",
  },
  dayLabelActive: {
    color: "#ffd361",
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#3a3630",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleDone: {
    backgroundColor: "#f0b739",
    borderColor: "#f0b739",
  },
  dayCircleActive: {
    borderWidth: 2,
    borderColor: "#ffd361",
  },
  dayCircleLocked: {
    borderColor: "#45413a",
  },
  dayCircleText: {
    color: "#ffd361",
    fontSize: 14,
    fontWeight: "800",
  },
  dayCircleTextDone: {
    color: "#24180b",
  },
  dayCircleTextLocked: {
    color: "#6d6558",
    fontSize: 9,
  },
  dayMeta: {
    color: "#7e7668",
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.6,
  },
  statsRow: {
    gap: 12,
  },
  statChip: {
    backgroundColor: "#171718",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#252526",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2a2216",
  },
  statChipLabel: {
    color: "#8e8576",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  statChipValue: {
    color: "#f5efe3",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: "#141415",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#242425",
  },
  detailsTitle: {
    color: "#ffd361",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.7,
    marginBottom: 12,
  },
  detailsLine: {
    color: "#b6ad9b",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
});
