-- Guest mode: connect by ID + password without registration.
-- Token identifying a guest (unregistered) participant.
ALTER TABLE t_p23746347_remote_access_assist.devices
    ADD COLUMN IF NOT EXISTS guest_token VARCHAR(64) NOT NULL DEFAULT '';

ALTER TABLE t_p23746347_remote_access_assist.sessions
    ADD COLUMN IF NOT EXISTS guest_token VARCHAR(64) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_devices_guest_token
    ON t_p23746347_remote_access_assist.devices (guest_token);

CREATE INDEX IF NOT EXISTS idx_sessions_guest_token
    ON t_p23746347_remote_access_assist.sessions (guest_token);
