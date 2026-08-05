-- ===========================================================================
-- Migration 003 — add image_url to messages
-- ---------------------------------------------------------------------------
-- Persist image conversations: a user turn that used Gemini Vision now stores
-- the Cloudinary image URL it was sent with, alongside its text prompt.
--
-- Backward compatibility:
--   * The column is NULLABLE with DEFAULT NULL. Every pre-existing row and all
--     text-only messages simply have image_url = NULL.
--   * Inserts that omit the column keep working unchanged (they get NULL).
--   * Reads that ignore the column are unaffected.
--
-- Note: MySQL has no "ADD COLUMN IF NOT EXISTS". The migration runner tracks
-- applied files in `schema_migrations`, so this file is applied exactly once.
-- ===========================================================================

ALTER TABLE messages
  ADD COLUMN image_url VARCHAR(1024) DEFAULT NULL AFTER content;
