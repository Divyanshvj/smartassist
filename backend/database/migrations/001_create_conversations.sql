-- ===========================================================================
-- Migration 001 — conversations
-- ---------------------------------------------------------------------------
-- One row per chat thread, owned by a user. ON DELETE CASCADE from users means
-- deleting an account removes all of its conversations (and, transitively, the
-- messages below). Idempotent via IF NOT EXISTS so re-running is safe.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  title      VARCHAR(255)    DEFAULT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversations_user_id (user_id),
  KEY idx_conversations_user_updated (user_id, updated_at),
  CONSTRAINT fk_conversations_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
