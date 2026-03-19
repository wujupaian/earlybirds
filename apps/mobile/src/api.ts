import axios from "axios";

export const API_BASE_URL = "http://127.0.0.1:5001/earlybirds-1fa01/asia-southeast1/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
});

export async function uploadFcmToken(params: {
  authToken: string;
  fcmToken: string;
}) {
  const response = await client.put(
    "/user/fcm-token",
    { fcmToken: params.fcmToken },
    {
      headers: {
        Authorization: `Bearer ${params.authToken}`,
      },
    },
  );

  return response.data;
}

