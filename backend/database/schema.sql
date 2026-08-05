-- ===========================================================================
-- SmartAssist — MySQL schema
-- ---------------------------------------------------------------------------
-- Engine : InnoDB (required for FOREIGN KEY + transactions)
-- Charset: utf8mb4 (full Unicode, including emoji in chat content)
--
-- Delete strategy: HARD delete via ON DELETE CASCADE. Removing a parent row
-- automatically removes its children:
--   user  ->  conversations  ->  messages  ->  message_metadata
--   user  ->  refresh_tokens
--
-- Tables are created parent-first so each FK's target already exists.
-- ===========================================================================

CREATE DATABASE IF NOT EXISTS smartassist
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smartassist;

-- ---------------------------------------------------------------------------
-- 1. users — one row per account (Signup / Login)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. conversations — one row per chat thread (Save / View previous chats)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3. messages — one row per turn (Chat with AI / Generate AI responses)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  role            ENUM('user','assistant','system') NOT NULL,
  content         TEXT            NOT NULL,
  -- Optional Cloudinary image URL for a Vision turn (NULL for text messages).
  image_url       VARCHAR(1024)   DEFAULT NULL,
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

-- ---------------------------------------------------------------------------
-- 4. message_metadata — 0-or-1 row per AI message (generation details)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_metadata (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id        BIGINT UNSIGNED NOT NULL,
  model             VARCHAR(100)    NOT NULL,
  prompt_tokens     INT UNSIGNED    DEFAULT NULL,
  completion_tokens INT UNSIGNED    DEFAULT NULL,
  total_tokens      INT UNSIGNED    DEFAULT NULL,
  latency_ms        INT UNSIGNED    DEFAULT NULL,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_message_metadata_message (message_id),
  CONSTRAINT fk_message_metadata_message
    FOREIGN KEY (message_id) REFERENCES messages (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. refresh_tokens — server-side sessions (Login / logout / revoke)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255)    NOT NULL,
  expires_at TIMESTAMP       NOT NULL,
  revoked_at TIMESTAMP       NULL DEFAULT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_token (token_hash),
  KEY idx_refresh_tokens_user (user_id),
  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
