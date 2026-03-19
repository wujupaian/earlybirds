import { messaging } from "./admin.js";
import { firestoreRepository } from "../repositories.js";

export async function sendNotificationToWallet(params: {
  walletAddress: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  const user = await firestoreRepository.getUser(params.walletAddress);

  if (!user?.fcmToken) {
    return {
      delivered: false,
      reason: "FCM_TOKEN_MISSING",
    };
  }

  const messageId = await messaging.send({
    token: user.fcmToken,
    notification: {
      title: params.title,
      body: params.body,
    },
    data: params.data,
  });

  return {
    delivered: true,
    messageId,
  };
}

