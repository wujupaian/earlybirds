import { nextMonday, previousMonday } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import type { Challenge, RewardBatch } from "./types";

const PLATFORM_FEE_RATE = 0.1;
const SOL_PER_CHALLENGE = 0.1;
const PHT = "Asia/Manila";

function roundSol(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export function getRewardPeriod(nowUtc: Date): { periodStart: Date; periodEnd: Date } {
  const phtDateLabel = formatInTimeZone(nowUtc, PHT, "yyyy-MM-dd");
  const phtAnchorUtc = fromZonedTime(`${phtDateLabel} 09:00:00`, PHT);
  const periodEnd = fromZonedTime(
    `${formatInTimeZone(nextMonday(phtAnchorUtc), PHT, "yyyy-MM-dd")} 09:00:00`,
    PHT,
  );
  const periodStart = fromZonedTime(
    `${formatInTimeZone(previousMonday(periodEnd), PHT, "yyyy-MM-dd")} 09:00:00`,
    PHT,
  );
  return { periodStart, periodEnd };
}

export function getNextDistributionTime(nowUtc: Date): Date {
  return getRewardPeriod(nowUtc).periodEnd;
}

export function buildRewardBatch(params: {
  batchId: string;
  eligibleChallenges: Challenge[];
  rolloverSol?: number;
  distributed?: boolean;
}): RewardBatch {
  const completed = params.eligibleChallenges.filter((item) => item.status === "completed");
  const failed = params.eligibleChallenges.filter((item) => item.status === "failed");
  const totalDepositSol = roundSol(params.eligibleChallenges.length * SOL_PER_CHALLENGE);
  const incomingRollover = params.rolloverSol ?? 0;
  const platformFeeSol = failed.length === 0 ? 0 : roundSol(totalDepositSol * PLATFORM_FEE_RATE);
  const rewardPoolSol = roundSol(totalDepositSol - platformFeeSol + incomingRollover);
  const rewardPerUserSol =
    completed.length === 0
      ? 0
      : failed.length === 0
        ? SOL_PER_CHALLENGE
        : roundSol(rewardPoolSol / completed.length);
  const rolloverSol = completed.length === 0 ? rewardPoolSol : 0;
  const { periodStart, periodEnd } = getRewardPeriod(new Date());

  return {
    id: params.batchId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    successCount: completed.length,
    failedCount: failed.length,
    totalDepositSol,
    platformFeeSol,
    rewardPoolSol,
    rewardPerUserSol,
    rolloverSol,
    status: params.distributed ? "distributed" : "pending",
    distributedAt: params.distributed ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  };
}

