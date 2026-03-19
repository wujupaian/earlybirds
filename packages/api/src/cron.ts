import { distributeRewards, markMissedChallenges, sweepPendingPayments } from "./domain.js";

type CronJob = {
  name: string;
  schedule: string;
  timezone: string;
  handler: () => void | Promise<void>;
};

export const cronJobs: CronJob[] = [
  {
    name: "daily-checkin-sweep",
    schedule: "2 5 * * *",
    timezone: "Asia/Manila",
    handler: async () => {
      markMissedChallenges();
    },
  },
  {
    name: "weekly-reward-distribution",
    schedule: "0 9 * * 1",
    timezone: "Asia/Manila",
    handler: async () => {
      distributeRewards();
    },
  },
  {
    name: "pending-payment-poll",
    schedule: "*/10 * * * * *",
    timezone: "UTC",
    handler: async () => {
      sweepPendingPayments();
    },
  },
];

export function describeCronJobs() {
  return cronJobs.map((job) => ({
    name: job.name,
    schedule: job.schedule,
    timezone: job.timezone,
  }));
}

