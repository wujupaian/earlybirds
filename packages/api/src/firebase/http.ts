import {
  buildPaymentInitResponse,
  createNonce,
  distributeRewards,
  getActiveChallenges,
  getChallengeDetail,
  getHistory,
  getNextDistribution,
  getPaymentStatus,
  getRewardBatch,
  getRewardHistory,
  setUserFcmToken,
  simulatePaymentConfirmation,
  submitCheckin,
  upsertUser,
  verifyWalletNonce,
} from "../domain.js";
import { firestoreRepository } from "../repositories.js";
import { signWalletToken, verifyWalletToken } from "./auth.js";

function sendJson(res: any, status: number, body: unknown) {
  res.status(status).json(body);
}

function normalizePath(req: any) {
  return (req.path || req.url || "/").split("?")[0];
}

export async function handleApiRequest(req: any, res: any) {
  const path = normalizePath(req);
  const method = req.method.toUpperCase();
  const body = typeof req.body === "object" && req.body !== null ? req.body : {};

  try {
    if (method === "GET" && path === "/health") {
      return sendJson(res, 200, { ok: true, backend: "firebase-functions" });
    }

    if (method === "POST" && path === "/auth/nonce") {
      const nonce = await createNonce(body.walletAddress);
      return sendJson(res, 200, { walletAddress: body.walletAddress, nonce });
    }

    if (method === "POST" && path === "/auth/verify") {
      await verifyWalletNonce(body.walletAddress, body.signature);
      if (body.timezone) {
        await upsertUser(body.walletAddress, body.timezone);
      }
      return sendJson(res, 200, {
        token: signWalletToken(body.walletAddress),
        walletAddress: body.walletAddress,
        timezone: body.timezone ?? "Asia/Manila",
        note: "Wallet signature verification remains a scaffold in this MVP.",
      });
    }

    if (method === "PUT" && path === "/user/timezone") {
      const walletAddress = verifyWalletToken(req.headers.authorization);
      return sendJson(res, 200, { user: await upsertUser(walletAddress, body.timezone) });
    }

    if (method === "PUT" && path === "/user/fcm-token") {
      const walletAddress = verifyWalletToken(req.headers.authorization);
      return sendJson(res, 200, { user: await setUserFcmToken(walletAddress, body.fcmToken) });
    }

    if (method === "GET" && path === "/user/me") {
      const walletAddress = verifyWalletToken(req.headers.authorization);
      return sendJson(res, 200, { user: await firestoreRepository.getUser(walletAddress) });
    }

    if (method === "POST" && path === "/challenge/initiate") {
      const walletAddress = verifyWalletToken(req.headers.authorization);
      const savedUser = await firestoreRepository.getUser(walletAddress);
      const timezone = body.timezone ?? savedUser?.timezone ?? "Asia/Manila";
      return sendJson(res, 200, await buildPaymentInitResponse(walletAddress, timezone));
    }

    if (method === "GET" && path === "/challenge/payment-status") {
      if (req.query.autoActivate === "true") {
        const challenge = await simulatePaymentConfirmation(String(req.query.reference));
        return sendJson(res, 200, { success: true, status: challenge.status, challenge });
      }
      const challenge = await getPaymentStatus(String(req.query.reference));
      return sendJson(res, 200, { success: challenge.status === "active", status: challenge.status, challenge });
    }

    if (method === "GET" && path === "/challenge/active") {
      const walletAddress = verifyWalletToken(req.headers.authorization);
      return sendJson(res, 200, { challenges: await getActiveChallenges(walletAddress) });
    }

    if (method === "GET" && path === "/challenge/history") {
      const walletAddress = verifyWalletToken(req.headers.authorization);
      return sendJson(res, 200, { challenges: await getHistory(walletAddress) });
    }

    if (method === "POST" && path === "/challenge/checkin") {
      const walletAddress = verifyWalletToken(req.headers.authorization);
      return sendJson(res, 200, await submitCheckin(walletAddress, body.challengeId));
    }

    if (method === "GET" && path.startsWith("/challenge/")) {
      verifyWalletToken(req.headers.authorization);
      return sendJson(res, 200, await getChallengeDetail(path.split("/")[2]));
    }

    if (method === "GET" && path === "/reward/history") {
      const walletAddress = verifyWalletToken(req.headers.authorization);
      return sendJson(res, 200, { rewards: await getRewardHistory(walletAddress) });
    }

    if (method === "GET" && path.startsWith("/reward/batch/")) {
      return sendJson(res, 200, { batch: await getRewardBatch(path.split("/")[3]) });
    }

    if (method === "GET" && path === "/reward/next-distribution") {
      return sendJson(res, 200, { timestamp: getNextDistribution() });
    }

    if (method === "POST" && path === "/admin/reward/distribute") {
      if (req.headers["x-admin-key"] !== (process.env.ADMIN_API_KEY ?? "replace-admin-key")) {
        return sendJson(res, 401, { error: "UNAUTHORIZED" });
      }
      return sendJson(res, 200, { batch: await distributeRewards() });
    }

    return sendJson(res, 404, { error: "NOT_FOUND" });
  } catch (error) {
    return sendJson(res, 400, { error: (error as Error).message });
  }
}

