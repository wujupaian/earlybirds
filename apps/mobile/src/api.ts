import axios from "axios";

export const API_BASE_URL = "http://127.0.0.1:5001/earlybirds-59ef4/asia-southeast1/api";


const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
});

export type ChallengeSummary = {
  id: string;
  walletAddress: string;
  status: string;
  timezone: string;
  startTime?: string;
  endTime?: string;
  referencePubkey: string;
  rewardAmount?: number;
};

export type CheckinRecord = {
  id: string;
  challengeId: string;
  dayNumber: number;
  checkDate: string;
  checkedIn: boolean;
  checkedInAt?: string;
  createdAt: string;
};

export type RewardBatchSummary = {
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
  status: string;
  distributedAt?: string;
  createdAt: string;
};

export type ManualPayoutRecipient = {
  challengeId: string;
  walletAddress: string;
  rewardAmountLamports: number;
  rewardAmountSol: number;
};

export async function requestNonce(walletAddress: string) {
  const response = await client.post("/auth/nonce", { walletAddress });
  return response.data as { walletAddress: string; nonce: string };
}

export async function verifyWallet(params: {
  walletAddress: string;
  signature: string;
  timezone: string;
}) {
  const response = await client.post("/auth/verify", params);
  return response.data as {
    token: string;
    walletAddress: string;
    timezone: string;
    note: string;
  };
}

export async function updateTimezone(params: {
  authToken: string;
  timezone: string;
}) {
  const response = await client.put(
    "/user/timezone",
    { timezone: params.timezone },
    {
      headers: {
        Authorization: `Bearer ${params.authToken}`,
      },
    },
  );

  return response.data;
}

export async function uploadFcmToken(params: {
  authToken: string;
  fcmToken: string;
}) {
  const response = await client.put(
    "/user/fcm-token",
    { fcmToken: params.fcmToken },
    {
      headers: {
        Authorization: `Bearer ${params.authToken}`,
      },
    },
  );

  return response.data;
}

export async function initiateChallenge(params: {
  authToken: string;
  timezone: string;
}) {
  const response = await client.post(
    "/challenge/initiate",
    { timezone: params.timezone },
    {
      headers: {
        Authorization: `Bearer ${params.authToken}`,
      },
    },
  );

  return response.data as {
    challengeId: string;
    recipient: string;
    amount: number;
    reference: string;
    memo: string;
  };
}

export async function getPaymentStatus(reference: string, autoActivate = false) {
  const response = await client.get("/challenge/payment-status", {
    params: {
      reference,
      autoActivate: autoActivate ? "true" : "false",
    },
  });

  return response.data as {
    success: boolean;
    status: string;
    challenge?: ChallengeSummary;
  };
}

export async function getActiveChallenges(authToken: string) {
  const response = await client.get("/challenge/active", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return response.data as { challenges: ChallengeSummary[] };
}

export async function getChallengeHistory(authToken: string) {
  const response = await client.get("/challenge/history", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return response.data as { challenges: ChallengeSummary[] };
}

export async function getChallengeDetail(params: {
  authToken: string;
  challengeId: string;
}) {
  const response = await client.get(`/challenge/${params.challengeId}`, {
    headers: {
      Authorization: `Bearer ${params.authToken}`,
    },
  });

  return response.data as {
    challenge: ChallengeSummary;
    checkins: CheckinRecord[];
  };
}

export async function submitCheckin(params: {
  authToken: string;
  challengeId: string;
  demo?: boolean;
}) {
  const response = await client.post(
    params.demo ? "/challenge/checkin-demo" : "/challenge/checkin",
    { challengeId: params.challengeId },
    {
      headers: {
        Authorization: `Bearer ${params.authToken}`,
      },
    },
  );

  return response.data as {
    success: boolean;
    dayNumber: number;
    streak: number;
    remainingDays: number;
  };
}

export async function getAdminRewardBatches(adminKey: string) {
  const response = await client.get("/admin/reward/batches", {
    headers: {
      "x-admin-key": adminKey,
    },
  });

  return response.data as {
    batches: RewardBatchSummary[];
  };
}

export async function getManualPayoutPreview(params: {
  adminKey: string;
  batchId: string;
}) {
  const response = await client.get(`/admin/reward/manual-preview/${params.batchId}`, {
    headers: {
      "x-admin-key": params.adminKey,
    },
  });

  return response.data as {
    batch: RewardBatchSummary;
    recipients: ManualPayoutRecipient[];
  };
}

export async function markBatchDistributed(params: {
  adminKey: string;
  batchId: string;
}) {
  const response = await client.post(
    `/admin/reward/mark-distributed/${params.batchId}`,
    {},
    {
      headers: {
        "x-admin-key": params.adminKey,
      },
    },
  );

  return response.data as {
    batch: RewardBatchSummary;
  };
}
