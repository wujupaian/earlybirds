import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { config } from "./config.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerChallengeRoutes } from "./routes/challenge.js";
import { registerRewardRoutes } from "./routes/reward.js";
import { registerUserRoutes } from "./routes/user.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { describeCronJobs } from "./cron.js";

declare module "fastify" {
  interface FastifyRequest {
    walletAddress?: string;
  }
}

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(jwt, { secret: config.jwtSecret });

  app.decorate("authenticate", async function authenticate(request: any, reply: any) {
    try {
      await request.jwtVerify();
      request.walletAddress = request.user.walletAddress;
    } catch {
      reply.code(401).send({ error: "UNAUTHORIZED" });
    }
  });

  app.get("/health", async () => ({ ok: true }));
  app.get("/meta/cron", async () => ({ jobs: describeCronJobs() }));
  app.register(registerAuthRoutes, { prefix: "/auth" });
  app.register(registerChallengeRoutes, { prefix: "/challenge" });
  app.register(registerRewardRoutes, { prefix: "/reward" });
  app.register(registerUserRoutes, { prefix: "/user" });
  app.register(registerAdminRoutes, { prefix: "/admin" });

  return app;
}
