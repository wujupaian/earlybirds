import type { Challenge, Checkin, RewardBatch, User } from "@earlybirds/shared";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase/admin.js";

const users = db.collection("users");
const challenges = db.collection("challenges");
const rewardBatches = db.collection("reward_batches");
const authNonces = db.collection("auth_nonces");
const appState = db.collection("app_state");

function toIso(value?: string | Timestamp | null): string | undefined {
  if (!value) {
    return undefined;
  }
  return typeof value === "string" ? value : value.toDate().toISOString();
}

function serializeChallenge(challenge: Challenge) {
  return {
    ...challenge,
    startTime: challenge.startTime ? Timestamp.fromDate(new Date(challenge.startTime)) : null,
    endTime: challenge.endTime ? Timestamp.fromDate(new Date(challenge.endTime)) : null,
    createdAt: Timestamp.fromDate(new Date(challenge.createdAt)),
  };
}

function deserializeChallenge(data: any): Challenge {
  return {
    ...data,
    startTime: toIso(data.startTime),
    endTime: toIso(data.endTime),
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
  };
}

function serializeCheckin(checkin: Checkin) {
  return {
    ...checkin,
    checkedInAt: checkin.checkedInAt ? Timestamp.fromDate(new Date(checkin.checkedInAt)) : null,
    createdAt: Timestamp.fromDate(new Date(checkin.createdAt)),
  };
}

function deserializeCheckin(data: any): Checkin {
  return {
    ...data,
    checkedInAt: toIso(data.checkedInAt),
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
  };
}

function serializeUser(user: User) {
  return {
    ...user,
    createdAt: Timestamp.fromDate(new Date(user.createdAt)),
  };
}

function deserializeUser(data: any): User {
  return {
    ...data,
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
  };
}

function serializeRewardBatch(batch: RewardBatch) {
  return {
    ...batch,
    periodStart: Timestamp.fromDate(new Date(batch.periodStart)),
    periodEnd: Timestamp.fromDate(new Date(batch.periodEnd)),
    distributedAt: batch.distributedAt ? Timestamp.fromDate(new Date(batch.distributedAt)) : null,
    createdAt: Timestamp.fromDate(new Date(batch.createdAt)),
  };
}

function deserializeRewardBatch(data: any): RewardBatch {
  return {
    ...data,
    periodStart: toIso(data.periodStart) ?? new Date().toISOString(),
    periodEnd: toIso(data.periodEnd) ?? new Date().toISOString(),
    distributedAt: toIso(data.distributedAt),
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
  };
}

export const firestoreRepository = {
  async getUser(walletAddress: string) {
    const doc = await users.doc(walletAddress).get();
    return doc.exists ? deserializeUser(doc.data()) : undefined;
  },

  async saveUser(user: User) {
    await users.doc(user.walletAddress).set(serializeUser(user), { merge: true });
    return user;
  },

  async saveNonce(walletAddress: string, nonce: string) {
    await authNonces.doc(walletAddress).set({
      walletAddress,
      nonce,
      createdAt: Timestamp.now(),
    });
  },

  async getNonce(walletAddress: string) {
    const doc = await authNonces.doc(walletAddress).get();
    return doc.exists ? (doc.data()?.nonce as string | undefined) : undefined;
  },

  async saveChallenge(challenge: Challenge) {
    await challenges.doc(challenge.id).set(serializeChallenge(challenge), { merge: true });
    return challenge;
  },

  async getChallenge(challengeId: string) {
    const doc = await challenges.doc(challengeId).get();
    return doc.exists ? deserializeChallenge(doc.data()) : undefined;
  },

  async findChallengeByReference(referencePubkey: string) {
    const snapshot = await challenges.where("referencePubkey", "==", referencePubkey).limit(1).get();
    return snapshot.empty ? undefined : deserializeChallenge(snapshot.docs[0].data());
  },

  async listChallengesByWallet(walletAddress: string) {
    const snapshot = await challenges.where("walletAddress", "==", walletAddress).get();
    return snapshot.docs.map((doc) => deserializeChallenge(doc.data()));
  },

  async listActiveChallengesByWallet(walletAddress: string) {
    const snapshot = await challenges
      .where("walletAddress", "==", walletAddress)
      .where("status", "in", ["pending_payment", "active"])
      .get();
    return snapshot.docs.map((doc) => deserializeChallenge(doc.data()));
  },

  async listChallengesByStatus(status: Challenge["status"]) {
    const snapshot = await challenges.where("status", "==", status).get();
    return snapshot.docs.map((doc) => deserializeChallenge(doc.data()));
  },

  async listFinalizedChallengesInWindow(periodStartIso: string, periodEndIso: string) {
    const snapshot = await challenges
      .where("status", "in", ["completed", "failed"])
      .where("endTime", ">=", Timestamp.fromDate(new Date(periodStartIso)))
      .where("endTime", "<", Timestamp.fromDate(new Date(periodEndIso)))
      .get();
    return snapshot.docs.map((doc) => deserializeChallenge(doc.data()));
  },

  async listChallengesByRewardBatch(batchId: string) {
    const snapshot = await challenges.where("rewardBatchId", "==", batchId).get();
    return snapshot.docs.map((doc) => deserializeChallenge(doc.data()));
  },

  async saveCheckins(challengeId: string, checkins: Checkin[]) {
    const batch = db.batch();
    for (const checkin of checkins) {
      const ref = challenges.doc(challengeId).collection("checkins").doc(checkin.id);
      batch.set(ref, serializeCheckin(checkin), { merge: true });
    }
    await batch.commit();
    return checkins;
  },

  async listCheckins(challengeId: string) {
    const snapshot = await challenges
      .doc(challengeId)
      .collection("checkins")
      .orderBy("dayNumber", "asc")
      .get();
    return snapshot.docs.map((doc) => deserializeCheckin(doc.data()));
  },

  async saveRewardBatch(batchRecord: RewardBatch) {
    await rewardBatches.doc(batchRecord.id).set(serializeRewardBatch(batchRecord), { merge: true });
    return batchRecord;
  },

  async getRewardBatch(batchId: string) {
    const doc = await rewardBatches.doc(batchId).get();
    return doc.exists ? deserializeRewardBatch(doc.data()) : undefined;
  },

  async getRewardHistoryForWallet(walletAddress: string) {
    const snapshot = await challenges.where("walletAddress", "==", walletAddress).get();
    return snapshot.docs
      .map((doc) => deserializeChallenge(doc.data()))
      .filter(
        (item) =>
          typeof item.rewardAmount === "number" ||
          item.status === "awaiting_manual_payout" ||
          item.status === "rewarded",
      );
  },

  async getRolloverSol() {
    const doc = await appState.doc("rewards").get();
    return doc.exists ? Number(doc.data()?.rolloverSol ?? 0) : 0;
  },

  async setRolloverSol(value: number) {
    await appState.doc("rewards").set({ rolloverSol: value }, { merge: true });
  },
};
