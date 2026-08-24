-- Service account that owns all guest (unregistered) devices and sessions.
-- Guests are separated from each other by guest_token, not by account.
INSERT INTO t_p23746347_remote_access_assist.accounts (email, full_name, company, role, password_hash)
SELECT 'guest@pv-access.local', 'Гостевой режим', '', 'guest', 'x'
WHERE NOT EXISTS (
    SELECT 1 FROM t_p23746347_remote_access_assist.accounts
    WHERE email = 'guest@pv-access.local'
);
