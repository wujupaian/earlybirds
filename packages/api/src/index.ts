import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { handleApiRequest } from "./firebase/http.js";
import {
  runDailyCheckinSweep,
  runPendingPaymentSweep,
  runWeeklyRewardDistribution,
} from "./firebase/schedules.js";

setGlobalOptions({
  region: "asia-southeast1",
  maxInstances: 10,
});

export const api = onRequest(
  {
    cors: true,
    timeoutSeconds: 60,
  },
  handleApiRequest,
);

export const dailyCheckinSweep = onSchedule(
  {
    schedule: "2 5 * * *",
    timeZone: "Asia/Manila",
  },
  async () => {
    await runDailyCheckinSweep();
  },
);

export const weeklyRewardDistribution = onSchedule(
  {
    schedule: "0 9 * * 1",
    timeZone: "Asia/Manila",
  },
  async () => {
    await runWeeklyRewardDistribution();
  },
);

export const pendingPaymentSweep = onSchedule(
  {
    schedule: "every 10 seconds",
    timeZone: "UTC",
  },
  async () => {
    await runPendingPaymentSweep();
  },
);

