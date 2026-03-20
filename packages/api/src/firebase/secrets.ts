import { defineSecret } from "firebase-functions/params";

export const platformWalletAddressSecret = defineSecret("PLATFORM_WALLET_ADDRESS");

export function getPlatformWalletAddress() {
  return (
    platformWalletAddressSecret.value() ||
    process.env.PLATFORM_WALLET_ADDRESS ||
    "EARLYBIRDS_PLATFORM_WALLET"
  );
}
