import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { store } from "../store.js";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/nonce", async (request) => {
    const body = request.body as { walletAddress: string };
    const nonce = randomUUID();
    store.nonces.set(body.walletAddress, nonce);
    return { walletAddress: body.walletAddress, nonce };
  });

  app.post("/verify", async (request) => {
    const body = request.body as {
      walletAddress: string;
      signature: string;
      timezone?: string;
    };

    const expectedNonce = store.nonces.get(body.walletAddress);
    if (!expectedNonce) {
      return { error: "NONCE_NOT_FOUND" };
    }

    if (!body.signature) {
      return { error: "INVALID_SIGNATURE" };
    }

    const token = await app.jwt.sign({ walletAddress: body.walletAddress });
    return {
      token,
      walletAddress: body.walletAddress,
      timezone: body.timezone ?? "Asia/Manila",
      note: "Signature verification is scaffolded; replace with real wallet verification before production.",
    };
  });
}

