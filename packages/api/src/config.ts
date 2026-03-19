import "dotenv/config";

export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? "replace-me",
  platformWallet: process.env.PLATFORM_WALLET ?? "EARLYBIRDS_PLATFORM_WALLET",
  adminApiKey: process.env.ADMIN_API_KEY ?? "replace-admin-key",
};

