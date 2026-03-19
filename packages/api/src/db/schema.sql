CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS reward_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  success_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  total_deposit_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
  platform_fee_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
  reward_pool_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
  reward_per_user_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
  rollover_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  distributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  wallet_address VARCHAR PRIMARY KEY,
  timezone VARCHAR NOT NULL,
  fcm_token VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR NOT NULL REFERENCES users(wallet_address),
  deposit_tx_sig VARCHAR UNIQUE,
  deposit_amount BIGINT NOT NULL DEFAULT 100000000,
  status VARCHAR(32) NOT NULL,
  timezone VARCHAR NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  reward_batch_id UUID REFERENCES reward_batches(id),
  reward_amount BIGINT,
  reference_pubkey VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_wallet_status
  ON challenges(wallet_address, status);

CREATE INDEX IF NOT EXISTS idx_challenges_end_time
  ON challenges(end_time);

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  check_date DATE NOT NULL,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_checkins_challenge_day
  ON checkins(challenge_id, day_number);

