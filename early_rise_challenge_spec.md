# Early Rise Challenge App — Product & Technical Specification

## Overview

A mobile app (iOS + Android) that incentivizes users to wake up early through a blockchain-based deposit mechanism. Users stake 0.1 SOL to join a 7-day early-rising challenge. Those who succeed share a reward pool funded by those who fail. All payments and rewards are handled on the Solana blockchain.

---

## Tech Stack

### Frontend
- **Framework**: React Native with Expo
- **Wallet Integration**: `@solana/wallet-adapter-react-native` (Phantom, Solflare, Backpack)
- **Solana Pay**: `@solana/pay`
- **Solana Web3**: `@solana/web3.js`
- **State Management**: Zustand
- **Data Fetching**: React Query + Axios
- **Push Notifications**: Expo Notifications (local + FCM remote)
- **Styling**: NativeWind (Tailwind for React Native)
- **Date/Timezone**: `date-fns-tz`

### Backend
- **Runtime**: Node.js
- **Framework**: Fastify
- **Database**: PostgreSQL
- **Cache / Session**: Redis
- **Scheduled Jobs**: `node-cron`
- **Solana RPC**: Helius or QuickNode
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Auth**: JWT (wallet address as identity, no username/password)
- **Deployment**: Docker + Railway or AWS

---

## User Identity

- No traditional registration. The user's **Solana wallet address** is the unique identifier.
- On first app open, user connects their wallet via Wallet Adapter.
- Backend issues a JWT upon wallet signature verification.
- JWT is included in all subsequent API request headers.

---

## Core Data Models

### `challenges` table

```sql
id                  UUID PRIMARY KEY
wallet_address      VARCHAR NOT NULL
deposit_tx_sig      VARCHAR UNIQUE          -- on-chain transaction signature
deposit_amount      BIGINT DEFAULT 100000000 -- lamports (0.1 SOL)
status              VARCHAR NOT NULL
  -- VALUES: 'pending_payment' | 'active' | 'completed' | 'failed' | 'rewarded'
timezone            VARCHAR NOT NULL        -- e.g. 'Asia/Manila', 'Asia/Shanghai'
start_time          TIMESTAMPTZ             -- next day 05:00:00 in user's timezone, stored as UTC
end_time            TIMESTAMPTZ             -- start_time + 7 days + 1 minute
reward_batch_id     UUID REFERENCES reward_batches(id)
reward_amount       BIGINT                  -- lamports actually received
reference_pubkey    VARCHAR UNIQUE          -- Solana Pay reference key for payment verification
created_at          TIMESTAMPTZ DEFAULT now()
```

### `checkins` table

```sql
id                  UUID PRIMARY KEY
challenge_id        UUID REFERENCES challenges(id)
day_number          INT NOT NULL            -- 1 through 7
check_date          DATE NOT NULL           -- local date in user's timezone
checked_in          BOOLEAN DEFAULT false
checked_in_at       TIMESTAMPTZ             -- server UTC time of checkin
created_at          TIMESTAMPTZ DEFAULT now()
UNIQUE(challenge_id, day_number)
```

### `reward_batches` table

```sql
id                  UUID PRIMARY KEY
period_start        TIMESTAMPTZ NOT NULL    -- previous Monday 09:00 PHT (UTC+8)
period_end          TIMESTAMPTZ NOT NULL    -- current Monday 09:00 PHT
success_count       INT
failed_count        INT
total_deposit_sol   NUMERIC                 -- (success + failed) * 0.1
platform_fee_sol    NUMERIC                 -- 10% of total_deposit_sol
reward_pool_sol     NUMERIC                 -- 90% of total_deposit_sol
reward_per_user_sol NUMERIC                 -- reward_pool / success_count
status              VARCHAR DEFAULT 'pending'  -- 'pending' | 'distributed'
distributed_at      TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT now()
```

### `users` table

```sql
wallet_address      VARCHAR PRIMARY KEY
timezone            VARCHAR NOT NULL
fcm_token           VARCHAR                 -- for push notifications
created_at          TIMESTAMPTZ DEFAULT now()
```

---

## Business Logic Rules

### Challenge Lifecycle

1. User initiates challenge → status = `pending_payment`
2. User pays 0.1 SOL → verified on-chain → status = `active`
3. `start_time` = next calendar day at 05:00:00 in the user's own timezone (converted to UTC)
4. `end_time` = `start_time` + 7 days + 1 minute
5. Each day from Day 1 to Day 7, a checkin record is pre-created with `checked_in = false`
6. At end of challenge:
   - All 7 days checked in → status = `completed`
   - Any day missed → status = `failed`

### Valid Checkin Window

- The user may check in between **04:59:00 and 05:01:00 in their own timezone**
- The server validates this using the stored `timezone` and the server's UTC clock
- The client device time is ignored entirely
- Only one checkin per day per challenge is allowed

```typescript
// Server-side validation
import { toZonedTime, format } from 'date-fns-tz';

function isValidCheckinTime(serverUtcNow: Date, userTimezone: string): boolean {
  const localTime = toZonedTime(serverUtcNow, userTimezone);
  const hhmmss = format(localTime, 'HH:mm:ss', { timeZone: userTimezone });
  return hhmmss >= '04:59:00' && hhmmss <= '05:01:00';
}
```

### Reward Distribution (Every Monday 09:00 AM PHT = UTC+8)

```
period_start = previous Monday 09:00 PHT
period_end   = this Monday 09:00 PHT

eligible challenges = all challenges where
  (status = 'completed' OR status = 'failed')
  AND end_time >= period_start
  AND end_time < period_end

total_deposit    = count(eligible) * 0.1 SOL
platform_fee     = total_deposit * 10%
reward_pool      = total_deposit * 90%
reward_per_user  = reward_pool / count(status = 'completed')

Actions:
  - Transfer reward_per_user SOL to each completed user's wallet_address
  - Platform wallet retains platform_fee
  - Update challenge status → 'rewarded'
  - Create reward_batch record
  - Send push notification to all rewarded users
```

**Edge cases:**
- If `success_count = 0` this week: entire pool rolls over to next week's pool (add to next period's pool)
- If `failed_count = 0` this week: completed users each receive back only their 0.1 SOL deposit (no extra reward)
- If on-chain transfer fails: retry 3 times with exponential backoff; if still failing, mark as `retry_pending` and alert admin

---

## Payment Flow (Solana Pay + Wallet Adapter)

### Step-by-step

1. User taps **"Pay 0.1 SOL to Join Challenge"**
2. Frontend calls `POST /challenge/initiate`
3. Backend:
   - Creates challenge record with status `pending_payment`
   - Generates a unique `reference_pubkey` (fresh Solana keypair pubkey)
   - Returns: `{ challengeId, recipient, amount, reference, memo }`
4. Frontend uses `@solana/pay` `createTransfer()` to build the transaction with the returned params
5. Frontend calls `sendTransaction()` via Wallet Adapter — this pops up the connected wallet (Phantom etc.) for user confirmation
6. User approves in wallet popup
7. Frontend polls `GET /challenge/payment-status?reference=<reference_pubkey>` every 3 seconds
8. Backend polls `getSignaturesForAddress(referencePubkey)` on Solana RPC; validates:
   - Recipient == platform wallet address
   - Amount == 100,000,000 lamports (0.1 SOL)
   - Transaction status == `finalized`
   - Memo contains challengeId (anti-replay)
9. On success: backend updates challenge status → `active`, returns success to frontend
10. Frontend navigates to "Challenge Active" screen
11. Payment timeout: if not confirmed within 5 minutes, mark as `expired` and surface error to user

```typescript
// Frontend payment trigger
import { createTransfer } from '@solana/pay';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import BigNumber from 'bignumber.js';
import { PublicKey } from '@solana/web3.js';

const { publicKey, sendTransaction } = useWallet();
const { connection } = useConnection();

async function handlePayDeposit() {
  const { challengeId, recipient, reference, memo } = await api.post('/challenge/initiate');

  const transaction = await createTransfer(connection, publicKey, {
    recipient: new PublicKey(recipient),
    amount: new BigNumber(0.1),
    reference: new PublicKey(reference),
    memo,
  });

  await sendTransaction(transaction, connection);
  startPollingPaymentStatus(reference);
}
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/nonce` | Returns a nonce for the wallet to sign |
| POST | `/auth/verify` | Verifies wallet signature, returns JWT |

### Challenge
| Method | Path | Description |
|--------|------|-------------|
| POST | `/challenge/initiate` | Create challenge, return Solana Pay params |
| GET | `/challenge/payment-status?reference=` | Poll on-chain payment confirmation |
| GET | `/challenge/active` | Get current user's active challenge |
| GET | `/challenge/:id` | Get full challenge detail + checkin history |
| GET | `/challenge/history` | Get all past challenges for current user |
| POST | `/challenge/checkin` | Submit daily checkin (JWT required) |

### Rewards
| Method | Path | Description |
|--------|------|-------------|
| GET | `/reward/history` | Current user's reward history |
| GET | `/reward/batch/:batchId` | Details of a reward batch |
| GET | `/reward/next-distribution` | Timestamp of next Monday 09:00 PHT |

### User
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/user/timezone` | Update user's stored timezone |
| PUT | `/user/fcm-token` | Register/update push notification token |

### Admin (internal, secured)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/reward/distribute` | Manually trigger reward distribution (also called by cron) |

---

### Checkin Request/Response

```typescript
// POST /challenge/checkin
// Header: Authorization: Bearer <jwt>
Request:  { challengeId: string }

// Success
Response: {
  success: true,
  dayNumber: 3,
  streak: 3,
  remainingDays: 4
}

// Error - outside time window
Response: { success: false, error: 'OUTSIDE_CHECKIN_WINDOW' }

// Error - already checked in today
Response: { success: false, error: 'ALREADY_CHECKED_IN' }
```

---

## Scheduled Jobs (node-cron, all times in PHT = UTC+8)

```typescript
// 1. Daily: Check for missed checkins and failed challenges
// Runs every day at 05:02 AM PHT
cron.schedule('2 5 * * *', async () => {
  // Find all active challenges where today's checkin window has passed
  // For any day_number whose window has closed and checked_in = false:
  //   mark that day as missed
  // If a challenge now has a missed day AND cannot possibly recover:
  //   set status = 'failed', send push notification
  // If end_time has passed:
  //   if all 7 days checked_in = true: set status = 'completed', send push notification
  //   else: set status = 'failed', send push notification
}, { timezone: 'Asia/Manila' });

// 2. Weekly: Reward distribution
// Runs every Monday at 09:00 AM PHT
cron.schedule('0 9 * * 1', async () => {
  // Run reward distribution logic described above
}, { timezone: 'Asia/Manila' });

// 3. Continuous: Payment status polling (runs every 10 seconds)
// Checks all challenges in 'pending_payment' status created < 5 minutes ago
// For each, queries Solana RPC for the reference_pubkey transaction
// On confirmation: activate challenge
// On timeout (> 5 min): mark as 'expired'
cron.schedule('*/10 * * * * *', checkPendingPayments);
```

---

## Frontend Screens & UI

### 1. Onboarding / Wallet Connect Screen
- Brief app description and rules
- "Connect Wallet" button (Wallet Adapter)
- After connect: request timezone from device, save via `PUT /user/timezone`

### 2. Home Screen
Displays one of these states based on active challenge:

| State | UI |
|-------|----|
| No active challenge | "Join a Challenge" CTA button |
| Pending payment | "Waiting for payment confirmation..." spinner |
| Active, checkin window not yet open | "Next checkin in: HH:MM:SS" countdown |
| Active, checkin window open (04:59–05:01) | Large green "CHECK IN NOW 🌅" button |
| Active, already checked in today | "✅ Day N checked in!" + progress bar |
| Active, today's window missed | "❌ Today's window missed" + streak broken warning |
| Completed (awaiting reward) | "🎉 Challenge Complete! Reward arrives [date]" |
| Rewarded | "💰 Reward received! Join next challenge?" |

### 3. Join Challenge Screen
- Displays: 0.1 SOL deposit, 7-day rules, checkin window explanation, next reward distribution date
- "Pay 0.1 SOL & Join" button
- Payment in-progress state (spinner + "Confirming on Solana...")
- Success state → navigate to Home

### 4. Challenge Detail Screen
- 7-day progress tracker (each day: ✅ checked in / ❌ missed / ⬜ upcoming)
- Checkin timestamps for completed days
- Challenge start/end time
- Estimated reward if successful

### 5. Reward History Screen
- List of past challenges with outcome and reward received
- Each row: date range, status badge, SOL amount

### 6. Profile Screen
- Connected wallet address (truncated)
- Timezone (editable)
- Total challenges completed / win rate stats

---

## Push Notifications

All notifications are sent via FCM to the user's registered `fcm_token`.

| Trigger | Message |
|---------|---------|
| Challenge activated (payment confirmed) | "🚀 Challenge started! First checkin window: tomorrow 04:59–05:01 AM" |
| 10 minutes before checkin window opens (04:49 AM local) | "⏰ Wake up! Checkin window opens in 10 minutes (04:59 AM)" |
| Checkin window opens (04:59 AM local) | "🌅 Checkin window is open! Open the app now to check in." |
| Daily checkin successful | "✅ Day N complete! Keep it up — N days to go." |
| Challenge completed (all 7 days done) | "🎉 You completed the challenge! Reward arrives [next Monday date] at 9:00 AM." |
| Challenge failed (missed a day) | "😔 Challenge failed. Your deposit goes to the reward pool. Join a new challenge?" |
| Reward distributed | "💰 [X.XX] SOL has been sent to your wallet! This week: N successes, N failures. Join the next challenge?" |
| No active challenge (sent after reward received) | "Ready for another week? Join a new 7-day challenge now!" |

Local notifications (scheduled on device) handle the 04:49 AM and 04:59 AM reminders to avoid server-side timezone complexity for time-sensitive nudges.

---

## Success & Failure Modal Content

### On Challenge Completion (all 7 days done)
```
🎉 Congratulations!
You completed the 7-day early rise challenge!

Your reward will be distributed on:
[Monday, March 23, 2026 at 9:00 AM]

Want to keep the streak going?
[Join Next Challenge]   [Maybe Later]
```

### On Reward Received (push notification tapped)
```
💰 Reward Received!
You earned [X.XX SOL] (deposit + reward)

This week's pool: N successes, N failures
Total pool: X.X SOL → You received X.XX SOL

No active challenge right now.
[Join New Challenge]
```

### On Challenge Failed
```
😔 Challenge Failed
You missed Day N's checkin window.
Your 0.1 SOL deposit has been added to this week's reward pool.

Don't give up — join a new challenge and try again!
[Try Again]   [Close]
```

---

## Security Considerations

- **Server time is authoritative**: checkin window validation always uses `Date.now()` on the server, never any client-supplied timestamp
- **Anti-replay for payments**: `memo` field contains `challengeId`; backend rejects any `reference_pubkey` that has already been used
- **JWT expiry**: 24 hours; wallet must re-sign nonce to refresh
- **Rate limiting**: checkin endpoint limited to 5 requests per minute per wallet address
- **Duplicate challenge guard**: a wallet may have multiple active challenges simultaneously (allowed), but each `reference_pubkey` is single-use
- **No timezone spoofing protection needed** (simplified per spec): checkin validation is purely server-side UTC + stored timezone; user cannot gain advantage by changing phone timezone because stored timezone is set at challenge creation and cannot be changed mid-challenge

---

## Wallet & Fund Flow Summary

```
User Wallet
    │
    │ 0.1 SOL (via Solana Pay + Wallet Adapter)
    ▼
Platform Custodial Wallet
    │
    ├─── Monday 9 AM ──► Completed Users' Wallets  (90% of pool ÷ winners)
    │
    └─── Platform Retains ──────────────────────────(10% of pool)
```

> **Note**: This is a centralized custodial model for MVP. A future upgrade path is to replace the platform wallet with a Solana smart contract (Program) that holds deposits in PDAs and releases funds based on on-chain oracle verification or admin multi-sig, reducing trust requirements.

---

## Rollover & Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| No successful users this week | Entire 90% pool rolls over and adds to next week's pool |
| No failed users this week | Successful users receive back only their 0.1 SOL (no extra) |
| On-chain reward transfer fails | Retry 3× with backoff; if still failing, mark `retry_pending`, alert admin; user notified of delay |
| Solana network congestion | Payment polling timeout extended to 10 minutes; user shown "Network is slow, please wait" |
| User joins challenge then network goes down at checkin time | Grace: request is accepted if it reaches server by 05:01:00 server-validated local time |
| Duplicate payment (user taps twice) | Second `reference_pubkey` transaction detected and ignored; only one challenge created per initiate call |
| User has no active challenge when reward arrives | Reward notification includes direct CTA to join new challenge |
