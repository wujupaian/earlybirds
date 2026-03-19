import type { FastifyInstance } from "fastify";
import {
  buildPaymentInitResponse,
  getActiveChallenges,
  getChallenge,
  getChallengeCheckins,
  getHistory,
  markMissedChallenges,
  simulatePaymentConfirmation,
  submitCheckin,
} from "../domain.js";
import { store } from "../store.js";

export async function registerChallengeRoutes(app: FastifyInstance) {
  app.post(
    "/initiate",
    { preHandler: [(app as any).authenticate] },
    async (request) => {
      const body = request.body as { timezone?: string };
      const walletAddress = request.walletAddress!;
      const userTimezone = body.timezone ?? store.users.get(walletAddress)?.timezone ?? "Asia/Manila";
      return buildPaymentInitResponse(walletAddress, userTimezone);
    },
  );

  app.get("/payment-status", async (request) => {
    const query = request.query as { reference: string; autoActivate?: string };
    if (query.autoActivate === "true") {
      const challenge = simulatePaymentConfirmation(query.reference);
      return { success: true, status: challenge.status, challenge };
    }

    const challenge = Array.from(store.challenges.values()).find(
      (item) => item.referencePubkey === query.reference,
    );

    if (!challenge) {
      return { success: false, error: "REFERENCE_NOT_FOUND" };
    }

    return { success: challenge.status === "active", status: challenge.status };
  });

  app.get(
    "/active",
    { preHandler: [(app as any).authenticate] },
    async (request) => {
      return {
        challenges: getActiveChallenges(request.walletAddress!),
      };
    },
  );

  app.get(
    "/history",
    { preHandler: [(app as any).authenticate] },
    async (request) => ({
      challenges: getHistory(request.walletAddress!),
    }),
  );

  app.get(
    "/:id",
    { preHandler: [(app as any).authenticate] },
    async (request) => {
      const params = request.params as { id: string };
      return {
        challenge: getChallenge(params.id),
        checkins: getChallengeCheckins(params.id),
      };
    },
  );

  app.post(
    "/checkin",
    { preHandler: [(app as any).authenticate] },
    async (request, reply) => {
      try {
        const body = request.body as { challengeId: string };
        return submitCheckin(request.walletAddress!, body.challengeId);
      } catch (error) {
        reply.code(400);
        return { success: false, error: (error as Error).message };
      }
    },
  );

  app.post("/sweep", async () => {
    return { updated: markMissedChallenges() };
  });
}

