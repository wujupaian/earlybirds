import type { Challenge, Checkin, RewardBatch, User } from "@earlybirds/shared";

export const store = {
  users: new Map<string, User>(),
  challenges: new Map<string, Challenge>(),
  checkins: new Map<string, Checkin[]>(),
  rewardBatches: new Map<string, RewardBatch>(),
  nonces: new Map<string, string>(),
  rolloverSol: 0,
  paymentExpiryMinutes: 5,
};
