import { distributeRewards, markMissedChallenges, sweepPendingPayments } from "../domain.js";

export async function runDailyCheckinSweep() {
  return markMissedChallenges();
}

export async function runWeeklyRewardDistribution() {
  return distributeRewards();
}

export async function runPendingPaymentSweep() {
  return sweepPendingPayments();
}

