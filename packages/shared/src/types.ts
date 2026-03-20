export type ChallengeStatus =
  | "pending_payment"
  | "active"
  | "completed"
  | "failed"
  | "awaiting_manual_payout"
  | "rewarded"
  | "expired"
  | "retry_pending";

export type RewardBatchStatus =
  | "pending"
  | "pending_manual_distribution"
  | "distributed"
  | "retry_pending";

export interface User {
  walletAddress: string;
  timezone: string;
  fcmToken?: string;
  createdAt: string;
}

export interface Challenge {
  id: string;
  walletAddress: string;
  depositTxSig?: string;
  depositAmount: number;
  status: ChallengeStatus;
  timezone: string;
  startTime?: string;
  endTime?: string;
  rewardBatchId?: string;
  rewardAmount?: number;
  referencePubkey: string;
  createdAt: string;
}

export interface Checkin {
  id: string;
  challengeId: string;
  dayNumber: number;
  checkDate: string;
  checkedIn: boolean;
  checkedInAt?: string;
  createdAt: string;
}

export interface RewardBatch {
  id: string;
  periodStart: string;
  periodEnd: string;
  successCount: number;
  failedCount: number;
  totalDepositSol: number;
  platformFeeSol: number;
  rewardPoolSol: number;
  rewardPerUserSol: number;
  rolloverSol: number;
  status: RewardBatchStatus;
  distributedAt?: string;
  createdAt: string;
}

export interface ManualPayoutRecipient {
  challengeId: string;
  walletAddress: string;
  rewardAmountLamports: number;
  rewardAmountSol: number;
}
