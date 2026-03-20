import {
  buildCheckins,
  buildRewardBatch,
  DEPOSIT_LAMPORTS,
  getChallengeDayNumber,
  getChallengeEndUtc,
  getNextChallengeStartUtc,
  getNextDistributionTime,
  getRewardPeriod,
  isValidCheckinTime,
  type Challenge,
  type User,
} from "@earlybirds/shared";
import { randomUUID } from "node:crypto";
import { firestoreRepository } from "./repositories.js";
import { sendNotificationToWallet } from "./firebase/messaging.js";

const platformWallet = process.env.PLATFORM_WALLET ?? "EARLYBIRDS_PLATFORM_WALLET";
const paymentExpiryMinutes = 5;

export async function upsertUser(walletAddress: string, timezone: string): Promise<User> {
  const existing = await firestoreRepository.getUser(walletAddress);
  const user: User = {
    walletAddress,
    timezone,
    fcmToken: existing?.fcmToken,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  return firestoreRepository.saveUser(user);
}

export async function setUserFcmToken(walletAddress: string, fcmToken: string) {
  const existing = await firestoreRepository.getUser(walletAddress);
  return firestoreRepository.saveUser({
    walletAddress,
    timezone: existing?.timezone ?? "Asia/Manila",
    fcmToken,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
}

export async function createNonce(walletAddress: string) {
  const nonce = randomUUID();
  await firestoreRepository.saveNonce(walletAddress, nonce);
  return nonce;
}

export async function verifyWalletNonce(walletAddress: string, signature: string) {
  const nonce = await firestoreRepository.getNonce(walletAddress);
  if (!nonce) {
    throw new Error("NONCE_NOT_FOUND");
  }
  if (!signature) {
    throw new Error("INVALID_SIGNATURE");
  }
  return true;
}

export async function createChallenge(walletAddress: string, timezone: string) {
  const challenge: Challenge = {
    id: randomUUID(),
    walletAddress,
    depositAmount: DEPOSIT_LAMPORTS,
    status: "pending_payment",
    timezone,
    referencePubkey: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await firestoreRepository.saveChallenge(challenge);
  return challenge;
}

export async function activateChallenge(challengeId: string, depositTxSig: string) {
  const challenge = await getChallenge(challengeId);
  const startTime = getNextChallengeStartUtc(new Date(), challenge.timezone);
  const endTime = getChallengeEndUtc(startTime);
  const next: Challenge = {
    ...challenge,
    depositTxSig,
    status: "active",
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
  await firestoreRepository.saveChallenge(next);
  await firestoreRepository.saveCheckins(
    challengeId,
    buildCheckins(challengeId, startTime, challenge.timezone),
  );
  await notifyChallengeActivated(next);
  return next;
}

export async function getChallenge(challengeId: string) {
  const challenge = await firestoreRepository.getChallenge(challengeId);
  if (!challenge) {
    throw new Error("CHALLENGE_NOT_FOUND");
  }
  return challenge;
}

export async function getChallengeDetail(challengeId: string) {
  const [challenge, checkins] = await Promise.all([
    getChallenge(challengeId),
    firestoreRepository.listCheckins(challengeId),
  ]);
  return { challenge, checkins };
}

export async function getActiveChallenges(walletAddress: string) {
  return firestoreRepository.listActiveChallengesByWallet(walletAddress);
}

export async function getHistory(walletAddress: string) {
  return firestoreRepository.listChallengesByWallet(walletAddress);
}

export async function buildPaymentInitResponse(walletAddress: string, timezone: string) {
  const challenge = await createChallenge(walletAddress, timezone);
  return {
    challengeId: challenge.id,
    recipient: platformWallet,
    amount: 0.1,
    reference: challenge.referencePubkey,
    memo: `challenge:${challenge.id}`,
  };
}

export async function getPaymentStatus(reference: string) {
  const challenge = await firestoreRepository.findChallengeByReference(reference);
  if (!challenge) {
    throw new Error("REFERENCE_NOT_FOUND");
  }
  return challenge;
}

export async function simulatePaymentConfirmation(reference: string) {
  const challenge = await getPaymentStatus(reference);
  if (challenge.status === "active") {
    return challenge;
  }
  return activateChallenge(challenge.id, `simulated-${Date.now()}`);
}

export async function submitCheckin(walletAddress: string, challengeId: string) {
  return submitCheckinInternal(walletAddress, challengeId, false);
}

export async function submitDemoCheckin(walletAddress: string, challengeId: string) {
  return submitCheckinInternal(walletAddress, challengeId, true);
}

async function submitCheckinInternal(walletAddress: string, challengeId: string, skipTimeWindow: boolean) {
  const challenge = await getChallenge(challengeId);
  if (challenge.walletAddress !== walletAddress) {
    throw new Error("FORBIDDEN");
  }
  if (challenge.status !== "active" || !challenge.startTime) {
    throw new Error("CHALLENGE_NOT_ACTIVE");
  }
  if (!skipTimeWindow && !isValidCheckinTime(new Date(), challenge.timezone)) {
    throw new Error("OUTSIDE_CHECKIN_WINDOW");
  }

  const checkins = await firestoreRepository.listCheckins(challengeId);
  const dayNumber = getChallengeDayNumber(new Date(challenge.startTime), new Date(), challenge.timezone);
  const target = checkins.find((item) => item.dayNumber === dayNumber);

  if (!target) {
    throw new Error("CHECKIN_NOT_FOUND");
  }
  if (target.checkedIn) {
    throw new Error("ALREADY_CHECKED_IN");
  }

  target.checkedIn = true;
  target.checkedInAt = new Date().toISOString();
  await firestoreRepository.saveCheckins(challengeId, checkins);

  const streak = checkins.filter((item) => item.checkedIn).length;
  if (streak === 7) {
    await firestoreRepository.saveChallenge({ ...challenge, status: "completed" });
  }

  return {
    success: true,
    dayNumber,
    streak,
    remainingDays: 7 - streak,
  };
}

export async function markMissedChallenges(now = new Date()) {
  const activeChallenges = await firestoreRepository.listChallengesByStatus("active");
  const updated: Challenge[] = [];

  for (const challenge of activeChallenges) {
    if (!challenge.endTime || new Date(challenge.endTime).getTime() > now.getTime()) {
      continue;
    }

    const checkins = await firestoreRepository.listCheckins(challenge.id);
    const allDone = checkins.length === 7 && checkins.every((item) => item.checkedIn);
    const next: Challenge = {
      ...challenge,
      status: allDone ? "completed" : "failed",
    };
    await firestoreRepository.saveChallenge(next);
    if (next.status === "completed") {
      await notifyChallengeCompleted(next);
    } else {
      await notifyChallengeFailed(next);
    }
    updated.push(next);
  }

  return updated;
}

export async function sweepPendingPayments(now = new Date()) {
  const pendingChallenges = await firestoreRepository.listChallengesByStatus("pending_payment");
  const expired: Challenge[] = [];

  for (const challenge of pendingChallenges) {
    const ageMs = now.getTime() - new Date(challenge.createdAt).getTime();
    if (ageMs <= paymentExpiryMinutes * 60_000) {
      continue;
    }

    const next: Challenge = { ...challenge, status: "expired" };
    await firestoreRepository.saveChallenge(next);
    expired.push(next);
  }

  return expired;
}

export async function distributeRewards(now = new Date()) {
  const { periodStart, periodEnd } = getRewardPeriod(now);
  const eligibleChallenges = await firestoreRepository.listFinalizedChallengesInWindow(
    periodStart.toISOString(),
    periodEnd.toISOString(),
  );
  const rolloverSol = await firestoreRepository.getRolloverSol();
  const batch = buildRewardBatch({
    batchId: randomUUID(),
    eligibleChallenges,
    rolloverSol,
    distributed: true,
  });

  await firestoreRepository.saveRewardBatch(batch);
  await firestoreRepository.setRolloverSol(batch.rolloverSol);

  for (const challenge of eligibleChallenges) {
    if (challenge.status !== "completed") {
      continue;
    }

    await firestoreRepository.saveChallenge({
      ...challenge,
      status: "rewarded",
      rewardBatchId: batch.id,
      rewardAmount: Math.round(batch.rewardPerUserSol * 1_000_000_000),
    });
    await notifyRewardDistributed({
      walletAddress: challenge.walletAddress,
      rewardAmountSol: batch.rewardPerUserSol.toFixed(2),
      batchId: batch.id,
    });
  }

  return batch;
}

export async function getRewardHistory(walletAddress: string) {
  return firestoreRepository.getRewardHistoryForWallet(walletAddress);
}

export async function getRewardBatch(batchId: string) {
  return firestoreRepository.getRewardBatch(batchId);
}

export function getNextDistribution() {
  return getNextDistributionTime(new Date()).toISOString();
}

async function notifyChallengeActivated(challenge: Challenge) {
  try {
    await sendNotificationToWallet({
      walletAddress: challenge.walletAddress,
      title: "Challenge started",
      body: "Your first early-bird check-in window opens tomorrow at 04:59.",
      data: {
        type: "challenge_activated",
        challengeId: challenge.id,
      },
    });
  } catch {
    return;
  }
}

async function notifyChallengeCompleted(challenge: Challenge) {
  try {
    await sendNotificationToWallet({
      walletAddress: challenge.walletAddress,
      title: "Challenge complete",
      body: "You completed all 7 days. Reward distribution is scheduled for next Monday at 9:00 AM PHT.",
      data: {
        type: "challenge_completed",
        challengeId: challenge.id,
      },
    });
  } catch {
    return;
  }
}

async function notifyChallengeFailed(challenge: Challenge) {
  try {
    await sendNotificationToWallet({
      walletAddress: challenge.walletAddress,
      title: "Challenge failed",
      body: "A daily check-in window was missed. You can start a new challenge anytime.",
      data: {
        type: "challenge_failed",
        challengeId: challenge.id,
      },
    });
  } catch {
    return;
  }
}

async function notifyRewardDistributed(params: {
  walletAddress: string;
  rewardAmountSol: string;
  batchId: string;
}) {
  try {
    await sendNotificationToWallet({
      walletAddress: params.walletAddress,
      title: "Reward sent",
      body: `${params.rewardAmountSol} SOL has been sent to your wallet.`,
      data: {
        type: "reward_distributed",
        batchId: params.batchId,
      },
    });
  } catch {
    return;
  }
}
