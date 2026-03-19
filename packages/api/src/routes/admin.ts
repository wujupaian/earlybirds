import type { FastifyInstance } from "fastify";
import { distributeRewards } from "../domain.js";
import { config } from "../config.js";

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post("/reward/distribute", async (request, reply) => {
    const headers = request.headers as Record<string, string | undefined>;
    if (headers["x-admin-key"] !== config.adminApiKey) {
      reply.code(401);
      return { error: "UNAUTHORIZED" };
    }

    return {
      batch: distributeRewards(),
    };
  });
}
