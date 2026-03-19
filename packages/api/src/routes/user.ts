import type { FastifyInstance } from "fastify";
import { setUserFcmToken, upsertUser } from "../domain.js";
import { repository } from "../repositories.js";

export async function registerUserRoutes(app: FastifyInstance) {
  app.put(
    "/timezone",
    { preHandler: [(app as any).authenticate] },
    async (request) => {
      const body = request.body as { timezone: string };
      return {
        user: upsertUser(request.walletAddress!, body.timezone),
      };
    },
  );

  app.put(
    "/fcm-token",
    { preHandler: [(app as any).authenticate] },
    async (request) => {
      const body = request.body as { fcmToken: string };
      return {
        user: setUserFcmToken(request.walletAddress!, body.fcmToken),
      };
    },
  );

  app.get(
    "/me",
    { preHandler: [(app as any).authenticate] },
    async (request) => ({
      user: repository.getUser(request.walletAddress!) ?? null,
    }),
  );
}
