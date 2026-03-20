import BigNumber from "bignumber.js";
import { validateTransfer } from "@solana/pay";
import {
  Connection,
  Finality,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import { DEPOSIT_LAMPORTS } from "@earlybirds/shared";

const rpcUrl = process.env.SOLANA_RPC_URL ?? clusterApiUrl("mainnet-beta");

let connection: Connection | null = null;

function getConnection() {
  if (!connection) {
    connection = new Connection(rpcUrl, {
      commitment: "confirmed",
    });
  }
  return connection;
}

export function generateReferencePubkey() {
  return Keypair.generate().publicKey.toBase58();
}

export async function validateDepositTransaction(params: {
  signature: string;
  recipient: string;
  reference: string;
  memo: string;
  finality?: Finality;
}) {
  const result = await validateTransfer(
    getConnection(),
    params.signature,
    {
      recipient: new PublicKey(params.recipient),
      amount: new BigNumber(DEPOSIT_LAMPORTS).shiftedBy(-9),
      reference: new PublicKey(params.reference),
      memo: params.memo,
    },
    {
      commitment: params.finality ?? "finalized",
    },
  );

  return result;
}

export async function findValidDepositSignature(params: {
  recipient: string;
  reference: string;
  memo: string;
}) {
  const referenceKey = new PublicKey(params.reference);
  const signatures = await getConnection().getSignaturesForAddress(referenceKey, {
    limit: 20,
  }, "finalized");

  for (const entry of signatures) {
    if (!entry.signature || entry.err) {
      continue;
    }

    try {
      await validateDepositTransaction({
        signature: entry.signature,
        recipient: params.recipient,
        reference: params.reference,
        memo: params.memo,
        finality: "finalized",
      });
      return entry.signature;
    } catch {
      continue;
    }
  }

  return null;
}

export function getSolanaRpcStatus() {
  return {
    rpcUrl,
    cluster: "mainnet-beta",
  };
}

