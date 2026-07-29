-- ===========================================================================
-- Migration 002 — messages
-- ---------------------------------------------------------------------------
-- One row per message in a conversation. `role` distinguishes who "spoke"; for
-- now only 'user' is produced (no AI yet), but the enum already allows
-- 'assistant'/'system' for later. ON DELETE CASCADE from conversations removes
-- a thread's messages automatically. Idempotent via IF NOT EXISTS.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS messages (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  role            ENUM('user','assistant','system') NOT NULL DEFAULT 'user',
  content         TEXT            NOT NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_conversation (conversation_id),
  KEY idx_messages_conversation_created (conversation_id, created_at),
  CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
