CREATE TABLE hooks (
  uuid           TEXT PRIMARY KEY,
  name           TEXT,
  targets        TEXT NOT NULL,
  expires_at     INTEGER,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  call_count     INTEGER NOT NULL DEFAULT 0,
  last_called_at INTEGER
);

CREATE INDEX idx_hooks_expires ON hooks(expires_at);

CREATE TABLE aliases (
  alias         TEXT PRIMARY KEY,
  chat_id       INTEGER NOT NULL,
  username      TEXT,
  registered_at INTEGER NOT NULL
);
