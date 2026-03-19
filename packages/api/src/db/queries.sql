-- Active challenges for one wallet
SELECT *
FROM challenges
WHERE wallet_address = $1
  AND status IN ('pending_payment', 'active')
ORDER BY created_at DESC;

-- Challenge detail with check-ins
SELECT *
FROM challenges
WHERE id = $1;

SELECT *
FROM checkins
WHERE challenge_id = $1
ORDER BY day_number ASC;

-- Reward distribution candidate set
SELECT *
FROM challenges
WHERE status IN ('completed', 'failed')
  AND end_time >= $1
  AND end_time < $2
ORDER BY end_time ASC;

