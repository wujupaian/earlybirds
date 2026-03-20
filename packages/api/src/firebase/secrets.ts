import { defineSecret } from "firebase-functions/params";

export const platformWalletAddressSecret = defineSecret("PLATFORM_WALLET_ADDRESS");
export const platformWalletPrivateKeySecret = defineSecret("PLATFORM_WALLET_PRIVATE_KEY");

export function getPlatformWalletAddress() {
  return (
    platformWalletAddressSecret.value() ||
    process.env.PLATFORM_WALLET_ADDRESS ||
    "EARLYBIRDS_PLATFORM_WALLET"
  );
}

export function getPlatformWalletPrivateKey() {
  return (
    platformWalletPrivateKeySecret.value() ||
    process.env.PLATFORM_WALLET_PRIVATE_KEY ||
    ""
  );
}

