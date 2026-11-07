-- Account scope added at the team's explicit request on 7 November 2026.
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS conversations (id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_owner ON sessions ((document->>'user_id'));
CREATE INDEX IF NOT EXISTS runs_owner ON runs ((document->>'user_id'));
CREATE INDEX IF NOT EXISTS cache_owner ON llm_cache ((document->>'user_id'));
