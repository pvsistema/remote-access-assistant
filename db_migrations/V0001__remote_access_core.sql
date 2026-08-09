CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    company VARCHAR(255) NOT NULL DEFAULT '',
    role VARCHAR(32) NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    device_uid VARCHAR(64) UNIQUE NOT NULL,
    access_id VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    os VARCHAR(64) NOT NULL DEFAULT '',
    os_version VARCHAR(64) NOT NULL DEFAULT '',
    app_version VARCHAR(32) NOT NULL DEFAULT '',
    local_ip VARCHAR(64) NOT NULL DEFAULT '',
    permanent_password VARCHAR(128) NOT NULL DEFAULT '',
    unattended BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    device_id INTEGER REFERENCES devices(id),
    access_id VARCHAR(16) NOT NULL,
    session_code VARCHAR(16) NOT NULL,
    one_time_password VARCHAR(16) NOT NULL DEFAULT '',
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    mode VARCHAR(24) NOT NULL DEFAULT 'control',
    operator_name VARCHAR(255) NOT NULL DEFAULT '',
    relay_url VARCHAR(255) NOT NULL DEFAULT '',
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    device_id INTEGER REFERENCES devices(id),
    session_id INTEGER REFERENCES sessions(id),
    event_type VARCHAR(64) NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    ip VARCHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_account ON devices(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_log_account ON activity_log(account_id, created_at DESC);
