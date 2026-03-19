# Earlybirds

Earlybirds is a mobile-first Solana challenge app scaffold built from the provided product spec. The repository is organized as a small monorepo with:

- `apps/mobile`: Expo React Native client
- `packages/api`: Firebase Functions backend
- `packages/shared`: shared challenge and reward domain logic

## Status

This is an MVP scaffold focused on:

- challenge lifecycle and check-in timing rules
- reward period calculation and batch math
- wallet-based auth API shape
- Firebase Functions + Firestore backend structure
- mobile home/join/detail/profile flows

The following pieces are intentionally left as integration points:

- real Solana RPC payment verification
- real wallet signature verification
- FCM push delivery
- production-grade Firestore indexes and security hardening

## Quick start

```bash
npm install
npm run dev:api
npm run dev:mobile
```

## Environment

Copy the example file before running the backend emulator:

```bash
cp packages/api/.env.example packages/api/.env
```

The Firebase entry point is [index.ts](/Volumes/virus%20base/myprojects/earlybirds/packages/api/src/index.ts), HTTP routing lives in [http.ts](/Volumes/virus%20base/myprojects/earlybirds/packages/api/src/firebase/http.ts), and Firestore access lives in [repositories.ts](/Volumes/virus%20base/myprojects/earlybirds/packages/api/src/repositories.ts).

## Suggested next steps

1. Wire `auth/verify` to actual wallet signature validation.
2. Replace mock payment confirmation with Helius or QuickNode RPC verification.
3. Add FCM push notification delivery for activation, reminders, failure, and rewards.
4. Add Firestore indexes requested by the Firebase console after first deploy.
