import type { FastifyInstance } from "fastify";
import { getNextDistributionTime } from "@earlybirds/shared";
import { repository } from "../repositories.js";

export async function registerRewardRoutes(app: FastifyInstance) {
  app.get(
    "/history",
    { preHandler: [(app as any).authenticate] },
    async (request) => ({
      rewards: repository.listChallenges().filter(
        (item) => item.walletAddress === request.walletAddress && Boolean(item.rewardAmount),
      ),
    }),
  );

  app.get("/batch/:batchId", async (request) => {
    const params = request.params as { batchId: string };
    return {
      batch: repository.getRewardBatch(params.batchId) ?? null,
    };
  });

  app.get("/next-distribution", async () => ({
    timestamp: getNextDistributionTime(new Date()).toISOString(),
  }));
}
