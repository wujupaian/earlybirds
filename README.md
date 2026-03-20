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

For Android Firebase app wiring, Expo reads [app.json](/Volumes/virus%20base/myprojects/earlybirds/apps/mobile/app.json) and uses the root-level [google-services.json](/Volumes/virus%20base/myprojects/earlybirds/google-services.json) for package `com.early.birds`.

The mobile app now includes push registration helpers in [notifications.ts](/Volumes/virus%20base/myprojects/earlybirds/apps/mobile/src/notifications.ts), and the backend can send FCM messages by wallet address through [messaging.ts](/Volumes/virus%20base/myprojects/earlybirds/packages/api/src/firebase/messaging.ts).

For local MVP validation, the mobile app also uses a demo check-in path that bypasses the strict 04:59-05:01 server window so the end-to-end flow can be tested outside the real wake-up slot.

## Suggested next steps

1. Wire `auth/verify` to actual wallet signature validation.
2. Replace mock payment confirmation with Helius or QuickNode RPC verification.
3. Add FCM push notification delivery for activation, reminders, failure, and rewards.
4. Add Firestore indexes requested by the Firebase console after first deploy.
