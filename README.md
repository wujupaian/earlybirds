# Earlybirds

Earlybirds is a mobile-first Solana challenge app scaffold built from the provided product spec. The repository is organized as a small monorepo with:

- `apps/mobile`: Expo React Native client
- `packages/api`: Fastify API server
- `packages/shared`: shared challenge and reward domain logic

## Status

This is an MVP scaffold focused on:

- challenge lifecycle and check-in timing rules
- reward period calculation and batch math
- wallet-based auth API shape
- mobile home/join/detail/profile flows

The following pieces are intentionally left as integration points:

- PostgreSQL and Redis persistence
- real Solana RPC payment verification
- real wallet signature verification
- FCM push delivery

## Backend notes

The API now includes:

- in-memory repository abstraction in [packages/api/src/repositories.ts](/Volumes/virus%20base/myprojects/earlybirds/packages/api/src/repositories.ts)
- SQL schema draft in [packages/api/src/db/schema.sql](/Volumes/virus%20base/myprojects/earlybirds/packages/api/src/db/schema.sql)
- reward candidate query sketches in [packages/api/src/db/queries.sql](/Volumes/virus%20base/myprojects/earlybirds/packages/api/src/db/queries.sql)
- cron job definitions in [packages/api/src/cron.ts](/Volumes/virus%20base/myprojects/earlybirds/packages/api/src/cron.ts)

This keeps the current app runnable while making the migration to PostgreSQL straightforward.

## Quick start

```bash
npm install
npm run dev:api
npm run dev:mobile
```

## Environment

Copy the example file before running the API:

```bash
cp packages/api/.env.example packages/api/.env
```

## Suggested next steps

1. Replace the in-memory repositories in `packages/api/src/store.ts` with PostgreSQL-backed repositories.
2. Wire `auth/verify` to actual wallet signature validation.
3. Replace mock payment confirmation with Helius or QuickNode RPC verification.
4. Add Expo wallet adapter, Solana Pay, and push notification integrations.
