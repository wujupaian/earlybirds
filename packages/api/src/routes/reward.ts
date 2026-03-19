import type { FastifyInstance } from "fastify";
import { getNextDistributionTime } from "@earlybirds/shared";
import { store } from "../store.js";

export async function registerRewardRoutes(app: FastifyInstance) {
  app.get(
    "/history",
    { preHandler: [(app as any).authenticate] },
    async (request) => ({
      rewards: Array.from(store.challenges.values()).filter(
        (item) => item.walletAddress === request.walletAddress && Boolean(item.rewardAmount),
      ),
    }),
  );

  app.get("/batch/:batchId", async (request) => {
    const params = request.params as { batchId: string };
    return {
      batch: store.rewardBatches.get(params.batchId) ?? null,
    };
  });

  app.get("/next-distribution", async () => ({
    timestamp: getNextDistributionTime(new Date()).toISOString(),
  }));
}

