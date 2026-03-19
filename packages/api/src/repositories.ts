import type { Challenge, Checkin, RewardBatch, User } from "@earlybirds/shared";
import { store } from "./store.js";

export interface Repository {
  getUser(walletAddress: string): User | undefined;
  saveUser(user: User): User;
  listChallenges(): Challenge[];
  getChallenge(challengeId: string): Challenge | undefined;
  saveChallenge(challenge: Challenge): Challenge;
  listCheckins(challengeId: string): Checkin[];
  saveCheckins(challengeId: string, checkins: Checkin[]): Checkin[];
  saveRewardBatch(batch: RewardBatch): RewardBatch;
  getRewardBatch(batchId: string): RewardBatch | undefined;
  listRewardBatches(): RewardBatch[];
}

export class InMemoryRepository implements Repository {
  getUser(walletAddress: string) {
    return store.users.get(walletAddress);
  }

  saveUser(user: User) {
    store.users.set(user.walletAddress, user);
    return user;
  }

  listChallenges() {
    return Array.from(store.challenges.values());
  }

  getChallenge(challengeId: string) {
    return store.challenges.get(challengeId);
  }

  saveChallenge(challenge: Challenge) {
    store.challenges.set(challenge.id, challenge);
    return challenge;
  }

  listCheckins(challengeId: string) {
    return store.checkins.get(challengeId) ?? [];
  }

  saveCheckins(challengeId: string, checkins: Checkin[]) {
    store.checkins.set(challengeId, checkins);
    return checkins;
  }

  saveRewardBatch(batch: RewardBatch) {
    store.rewardBatches.set(batch.id, batch);
    return batch;
  }

  getRewardBatch(batchId: string) {
    return store.rewardBatches.get(batchId);
  }

  listRewardBatches() {
    return Array.from(store.rewardBatches.values());
  }
}

export const repository: Repository = new InMemoryRepository();

