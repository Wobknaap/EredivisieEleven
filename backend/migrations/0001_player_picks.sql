CREATE TABLE IF NOT EXISTS player_picks (
  challenge_date TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  role TEXT NOT NULL,
  player_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (challenge_date, slot_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_player_picks_role ON player_picks(role, player_id);
CREATE INDEX IF NOT EXISTS idx_player_picks_session ON player_picks(challenge_date, session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_picks_unique_player ON player_picks(challenge_date, session_id, player_id);
