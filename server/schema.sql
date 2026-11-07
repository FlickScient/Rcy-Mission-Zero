CREATE TABLE IF NOT EXISTS mission_attempts (
  id BIGSERIAL PRIMARY KEY,
  attempt_id UUID NOT NULL UNIQUE,
  mission_id TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mission_attempts_mission_created_idx
  ON mission_attempts (mission_id, created_at DESC);
