import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET ?? "replace-me";

export function signWalletToken(walletAddress: string) {
  return jwt.sign({ walletAddress }, jwtSecret, { expiresIn: "24h" });
}

export function verifyWalletToken(authHeader?: string) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.slice("Bearer ".length);
  const payload = jwt.verify(token, jwtSecret) as { walletAddress: string };
  return payload.walletAddress;
}

