-- ============================================================
-- RIS MIGRATION: Move number_of_copies to request_document
-- ============================================================
-- WHY:
--   number_of_copies belongs to the line item (per document type),
--   not the order header (the whole request).
--   This allows: TOR × 3, Certificate × 1, Good Moral × 2
--   all under one document_request.
--
-- WHAT THIS DOES:
--   1. Add number_of_copies to request_document (default 1)
--   2. Drop number_of_copies from document_request
-- ============================================================

START TRANSACTION;

-- STEP 1: Add number_of_copies to request_document
-- DEFAULT 1 means existing rows get 1 copy automatically —
-- safe assumption since old data was test data anyway.
-- UNSIGNED: copies can't be negative.
-- CHECK constraint: enforces the 1–10 cap at the DB level,
-- not just in PHP. Defense in depth — even if someone bypasses
-- the API, the DB will reject invalid values.
ALTER TABLE request_document
  ADD COLUMN number_of_copies TINYINT UNSIGNED NOT NULL DEFAULT 1
    CHECK (number_of_copies BETWEEN 1 AND 10)
  AFTER document_type_id;

-- STEP 2: Drop number_of_copies from document_request
-- No FK references this column so it's safe to drop directly.
ALTER TABLE document_request
  DROP COLUMN number_of_copies;

COMMIT;

-- ============================================================
-- VERIFY
-- ============================================================
-- DESCRIBE request_document;
-- DESCRIBE document_request;
