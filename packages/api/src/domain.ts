import {
  buildCheckins,
  buildRewardBatch,
  DEPOSIT_LAMPORTS,
  getChallengeDayNumber,
  getChallengeEndUtc,
  getNextChallengeStartUtc,
  getNextDistributionTime,
  isValidCheckinTime,
  type Challenge,
  type Checkin,
  type RewardBatch,
  type User,
} from "@earlybirds/shared";
import { randomUUID } from "node:crypto";
import { store } from "./store.js";
import { config } from "./config.js";

export function upsertUser(walletAddress: string, timezone: string): User {
  const existing = store.users.get(walletAddress);
  const user: User = {
    walletAddress,
    timezone,
    fcmToken: existing?.fcmToken,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  store.users.set(walletAddress, user);
  return user;
}

export function setUserFcmToken(walletAddress: string, fcmToken: string): User {
  const existing = store.users.get(walletAddress) ?? upsertUser(walletAddress, "Asia/Manila");
  const next = { ...existing, fcmToken };
  store.users.set(walletAddress, next);
  return next;
}

export function createChallenge(walletAddress: string, timezone: string): Challenge {
  const id = randomUUID();
  const challenge: Challenge = {
    id,
    walletAddress,
    depositAmount: DEPOSIT_LAMPORTS,
    status: "pending_payment",
    timezone,
    referencePubkey: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.challenges.set(id, challenge);
  return challenge;
}

export function activateChallenge(challengeId: string, depositTxSig: string): Challenge {
  const challenge = getChallenge(challengeId);
  const startTime = getNextChallengeStartUtc(new Date(), challenge.timezone);
  const endTime = getChallengeEndUtc(startTime);
  const active: Challenge = {
    ...challenge,
    depositTxSig,
    status: "active",
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
  store.challenges.set(challengeId, active);
  store.checkins.set(challengeId, buildCheckins(challengeId, startTime, challenge.timezone));
  return active;
}

export function getChallenge(challengeId: string): Challenge {
  const challenge = store.challenges.get(challengeId);
  if (!challenge) {
    throw new Error("CHALLENGE_NOT_FOUND");
  }
  return challenge;
}

export function getChallengeCheckins(challengeId: string): Checkin[] {
  return store.checkins.get(challengeId) ?? [];
}

export function getActiveChallenges(walletAddress: string): Challenge[] {
  return Array.from(store.challenges.values()).filter(
    (item) => item.walletAddress === walletAddress && ["pending_payment", "active"].includes(item.status),
  );
}

export function getHistory(walletAddress: string): Challenge[] {
  return Array.from(store.challenges.values()).filter((item) => item.walletAddress === walletAddress);
}

export function submitCheckin(walletAddress: string, challengeId: string) {
  const challenge = getChallenge(challengeId);

  if (challenge.walletAddress !== walletAddress) {
    throw new Error("FORBIDDEN");
  }

  if (challenge.status !== "active" || !challenge.startTime) {
    throw new Error("CHALLENGE_NOT_ACTIVE");
  }

  if (!isValidCheckinTime(new Date(), challenge.timezone)) {
    throw new Error("OUTSIDE_CHECKIN_WINDOW");
  }

  const dayNumber = getChallengeDayNumber(new Date(challenge.startTime), new Date(), challenge.timezone);
  const checkins = getChallengeCheckins(challengeId);
  const todayCheckin = checkins.find((item) => item.dayNumber === dayNumber);

  if (!todayCheckin) {
    throw new Error("CHECKIN_NOT_FOUND");
  }

  if (todayCheckin.checkedIn) {
    throw new Error("ALREADY_CHECKED_IN");
  }

  todayCheckin.checkedIn = true;
  todayCheckin.checkedInAt = new Date().toISOString();

  const completedCount = checkins.filter((item) => item.checkedIn).length;
  if (completedCount === 7) {
    const completed: Challenge = { ...challenge, status: "completed" };
    store.challenges.set(challengeId, completed);
  }

  return {
    success: true,
    dayNumber,
    streak: completedCount,
    remainingDays: 7 - completedCount,
  };
}

export function markMissedChallenges(now = new Date()): Challenge[] {
  const updated: Challenge[] = [];

  for (const challenge of store.challenges.values()) {
    if (challenge.status !== "active" || !challenge.startTime || !challenge.endTime) {
      continue;
    }

    if (new Date(challenge.endTime).getTime() <= now.getTime()) {
      const checkins = getChallengeCheckins(challenge.id);
      const allDone = checkins.length === 7 && checkins.every((item) => item.checkedIn);
      const nextStatus: Challenge = {
        ...challenge,
        status: allDone ? "completed" : "failed",
      };
      store.challenges.set(challenge.id, nextStatus);
      updated.push(nextStatus);
    }
  }

  return updated;
}

export function distributeRewards(now = new Date()): RewardBatch {
  const eligible = Array.from(store.challenges.values()).filter((item) => {
    if (!item.endTime) {
      return false;
    }
    const end = new Date(item.endTime).getTime();
    const nextDistribution = getNextDistributionTime(now).getTime();
    const previousDistribution = nextDistribution - 7 * 24 * 60 * 60 * 1000;
    return ["completed", "failed"].includes(item.status) && end >= previousDistribution && end < nextDistribution;
  });

  const batch = buildRewardBatch({
    batchId: randomUUID(),
    eligibleChallenges: eligible,
    rolloverSol: store.rolloverSol,
    distributed: true,
  });

  store.rewardBatches.set(batch.id, batch);
  store.rolloverSol = batch.rolloverSol;

  for (const challenge of eligible) {
    if (challenge.status === "completed") {
      store.challenges.set(challenge.id, {
        ...challenge,
        status: "rewarded",
        rewardBatchId: batch.id,
        rewardAmount: Math.round(batch.rewardPerUserSol * 1_000_000_000),
      });
    }
  }

  return batch;
}

export function buildPaymentInitResponse(walletAddress: string, timezone: string) {
  const challenge = createChallenge(walletAddress, timezone);
  return {
    challengeId: challenge.id,
    recipient: config.platformWallet,
    amount: 0.1,
    reference: challenge.referencePubkey,
    memo: `challenge:${challenge.id}`,
  };
}

export function simulatePaymentConfirmation(reference: string) {
  const challenge = Array.from(store.challenges.values()).find((item) => item.referencePubkey === reference);
  if (!challenge) {
    throw new Error("REFERENCE_NOT_FOUND");
  }

  if (challenge.status === "active") {
    return challenge;
  }

  return activateChallenge(challenge.id, `simulated-${Date.now()}`);
}

