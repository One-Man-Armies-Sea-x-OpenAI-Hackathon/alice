CREATE TABLE IF NOT EXISTS runs (id text PRIMARY KEY, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS results (id text PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS llm_cache (id text PRIMARY KEY, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS recordings (id text PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS runs_created ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS cache_created ON llm_cache(created_at);
