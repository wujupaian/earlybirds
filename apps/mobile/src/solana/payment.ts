import BigNumber from "bignumber.js";
import { encodeURL } from "@solana/pay";
import { PublicKey } from "@solana/web3.js";

export function createSolanaPayUrl(params: {
  recipient: string;
  amount: number;
  reference: string;
  memo: string;
}) {
  const url = encodeURL({
    recipient: new PublicKey(params.recipient),
    amount: new BigNumber(params.amount),
    reference: new PublicKey(params.reference),
    memo: params.memo,
    label: "Earlybirds",
    message: "Join the 7-day early rise challenge",
  });

  return url.toString();
}

