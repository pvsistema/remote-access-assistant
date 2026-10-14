-- Own relay server (e.g. a Beget VPS) per account.
CREATE TABLE IF NOT EXISTS t_p23746347_remote_access_assist.relay_servers (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES t_p23746347_remote_access_assist.accounts(id),
    url VARCHAR(255) NOT NULL DEFAULT '',
    secret VARCHAR(128) NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_ok_at TIMESTAMP NULL,
    last_status VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_relay_servers_account
    ON t_p23746347_remote_access_assist.relay_servers (account_id);
