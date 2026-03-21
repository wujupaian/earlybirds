import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import { Platform } from "react-native";

type WalletAuthNonce = {
  walletAddress: string;
  message: string;
};

type WalletSignResult = {
  walletAddress: string;
  signature: string;
};

const appIdentity = {
  name: "Earlybirds",
  uri: "https://github.com/wujupaian/earlybirds",
  icon: "favicon.ico",
};

function assertWalletPlatform() {
  if (Platform.OS !== "android") {
    throw new Error("REAL_WALLET_LOGIN_ANDROID_ONLY_FOR_NOW");
  }
}

export async function authenticateWithMobileWallet(
  getNonceMessage: (walletAddress: string) => Promise<WalletAuthNonce>,
): Promise<WalletSignResult> {
  assertWalletPlatform();

  return transact(async (wallet) => {
    const authorization = await wallet.authorize({
      chain: "mainnet-beta",
      identity: appIdentity,
    });

    const account = authorization.accounts[0];
    if (!account) {
      throw new Error("WALLET_ACCOUNT_NOT_FOUND");
    }

    const walletAddress = new PublicKey(Buffer.from(account.address, "base64")).toBase58();
    const noncePayload = await getNonceMessage(walletAddress);

    const signed = await wallet.signMessages({
      addresses: [account.address],
      payloads: [Buffer.from(noncePayload.message, "utf8")],
    });

    const signedPayload = signed[0];
    if (!signedPayload) {
      throw new Error("WALLET_SIGNATURE_NOT_FOUND");
    }

    const signedPayloadBytes = Buffer.from(signedPayload);
    const messageBytes = signedPayloadBytes.subarray(0, Math.max(0, signedPayloadBytes.length - 64));
    const signatureBytes = signedPayloadBytes.subarray(Math.max(0, signedPayloadBytes.length - 64));

    const signedMessage = Buffer.from(messageBytes).toString("utf8");
    if (signedMessage && signedMessage !== noncePayload.message) {
      throw new Error("SIGNED_MESSAGE_MISMATCH");
    }

    return {
      walletAddress,
      signature: Buffer.from(signatureBytes).toString("base64"),
    };
  });
}
