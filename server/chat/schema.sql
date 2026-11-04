-- 会话消息层（与目录数据集分开）。按访客身份隔离，私有附件走对象存储。

CREATE TABLE IF NOT EXISTS chat_identities (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  token_hash text PRIMARY KEY,
  identity_id text NOT NULL REFERENCES chat_identities (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_sessions_identity_idx ON chat_sessions (identity_id);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES chat_identities (id) ON DELETE CASCADE,
  seed_key text NOT NULL,
  peer_name text NOT NULL,
  peer_avatar text NOT NULL DEFAULT '',
  peer_kind text NOT NULL CHECK (peer_kind IN ('maker', 'system')),
  preview text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, seed_key)
);

CREATE INDEX IF NOT EXISTS chat_conversations_owner_updated_idx
  ON chat_conversations (owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_memberships (
  conversation_id text NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
  identity_id text NOT NULL REFERENCES chat_identities (id) ON DELETE CASCADE,
  unread_count integer NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, identity_id)
);

CREATE TABLE IF NOT EXISTS chat_attachments (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
  uploader_id text NOT NULL REFERENCES chat_identities (id) ON DELETE CASCADE,
  object_key text NOT NULL,
  content_type text NOT NULL,
  file_name text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0),
  kind text NOT NULL CHECK (kind IN ('image', 'file')),
  status text NOT NULL CHECK (status IN ('pending', 'ready', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_attachments_conversation_idx ON chat_attachments (conversation_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('me', 'them')),
  sender_id text,
  client_msg_id text,
  kind text NOT NULL CHECK (kind IN ('text', 'image', 'file')),
  body text NOT NULL DEFAULT '',
  attachment_id text REFERENCES chat_attachments (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, client_msg_id)
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx
  ON chat_messages (conversation_id, created_at ASC);
