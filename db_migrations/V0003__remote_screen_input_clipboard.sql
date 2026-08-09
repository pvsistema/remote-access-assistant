CREATE TABLE IF NOT EXISTS t_p23746347_remote_access_assist.session_frames (
    session_id integer PRIMARY KEY REFERENCES t_p23746347_remote_access_assist.sessions(id),
    seq bigint NOT NULL DEFAULT 0,
    monitor smallint NOT NULL DEFAULT 1,
    width integer NOT NULL DEFAULT 0,
    height integer NOT NULL DEFAULT 0,
    image_b64 text NOT NULL DEFAULT '',
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS t_p23746347_remote_access_assist.session_commands (
    id bigserial PRIMARY KEY,
    session_id integer NOT NULL REFERENCES t_p23746347_remote_access_assist.sessions(id),
    kind character varying(24) NOT NULL,
    payload text NOT NULL DEFAULT '{}',
    taken boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_commands_pending
    ON t_p23746347_remote_access_assist.session_commands (session_id, taken, id);

CREATE TABLE IF NOT EXISTS t_p23746347_remote_access_assist.session_clipboard (
    session_id integer PRIMARY KEY REFERENCES t_p23746347_remote_access_assist.sessions(id),
    side character varying(16) NOT NULL DEFAULT 'client',
    text_value text NOT NULL DEFAULT '',
    seq bigint NOT NULL DEFAULT 0,
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

ALTER TABLE t_p23746347_remote_access_assist.file_transfers
    ADD COLUMN IF NOT EXISTS file_url text NOT NULL DEFAULT '';
ALTER TABLE t_p23746347_remote_access_assist.file_transfers
    ADD COLUMN IF NOT EXISTS delivered boolean NOT NULL DEFAULT false;
