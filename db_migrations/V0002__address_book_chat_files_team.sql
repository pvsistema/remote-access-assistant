CREATE TABLE IF NOT EXISTS device_groups (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE devices ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES device_groups(id);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS mac_address VARCHAR(32) NOT NULL DEFAULT '';

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS allow_control BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS allow_files BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS allow_clipboard BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS allow_audio BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_recorded BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS session_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    account_id INTEGER REFERENCES accounts(id),
    author VARCHAR(120) NOT NULL DEFAULT '',
    side VARCHAR(16) NOT NULL DEFAULT 'operator',
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_transfers (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    account_id INTEGER REFERENCES accounts(id),
    device_id INTEGER REFERENCES devices(id),
    file_name VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    direction VARCHAR(16) NOT NULL DEFAULT 'upload',
    status VARCHAR(16) NOT NULL DEFAULT 'done',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES accounts(id),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    role VARCHAR(32) NOT NULL DEFAULT 'operator',
    status VARCHAR(24) NOT NULL DEFAULT 'invited',
    invite_code VARCHAR(32) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_session ON session_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_files_account ON file_transfers(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_owner ON team_members(owner_id);
