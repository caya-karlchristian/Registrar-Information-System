-- ============================================================
-- RIS DATABASE MIGRATION SCRIPT
-- Branch: alumni-backend-branch
-- Date: 2026-03-24
-- ============================================================
-- WHAT THIS SCRIPT DOES (in safe order):
--   1. Clean up request_status to only your 5 required statuses
--   2. Remap all foreign key references in document_request + request_history
--   3. Drop unused tables (admin_contact_information, password_reset_tokens)
--   4. Create notification_types table (your named templates)
--   5. Create notifications table (per-user, soft-deletable, read-tracked)
-- ============================================================
-- HOW TO RUN:
--   docker exec -i ris_db mysql -urisadmin -p'YOUR_PASSWORD' registrar_information_system < ris_migration.sql
-- ============================================================

-- Safety: wrap everything in a transaction so if anything fails,
-- nothing is committed. The whole script rolls back cleanly.
START TRANSACTION;

-- ============================================================
-- SECTION 1: CLEAN UP request_status
-- ============================================================
-- Why this order? We must update all FK references BEFORE
-- we delete the old status rows, otherwise MySQL will throw
-- a foreign key constraint error (child rows still exist).

-- STEP 1A: Add the 2 missing statuses we need.
-- We insert with explicit IDs so FKs are predictable.
-- ID 4 = FORFEITED (replaces old "Processing" slot)
-- ID 5 = HISTORY
-- But first, old IDs 4,5,6 exist — we can't reuse them yet.
-- So we insert with temporary high IDs, remap, then clean up.

INSERT INTO request_status (status_id, status_name) VALUES
  (10, 'Forfeited'),
  (11, 'History');

-- STEP 1B: Remap document_request rows that reference removed statuses.
-- Old status 4 (Processing)  → new status 1 (Pending)
--   Reasoning: "Processing" was an in-between state. The closest
--   clean equivalent in your new model is Pending (admin hasn't
--   acted with a final status yet). Review and adjust if needed.
UPDATE document_request SET status_id = 1  WHERE status_id = 4;

-- Old status 5 (Rejected) → new status 10 (Forfeited)
--   Reasoning: "Rejected" semantically maps closest to "Forfeited"
--   in your new status model (request was denied/cancelled).
UPDATE document_request SET status_id = 10 WHERE status_id = 5;

-- Old status 6 (Ready) → new status 2 (Ready to claim)
--   Reasoning: "Ready" was clearly a duplicate of "Ready to claim".
UPDATE document_request SET status_id = 2  WHERE status_id = 6;

-- STEP 1C: Remap request_history rows (tracks old/new status transitions).
-- Same remapping logic applies to both old_status_id and new_status_id columns.
UPDATE request_history SET old_status_id = 1  WHERE old_status_id = 4;
UPDATE request_history SET old_status_id = 10 WHERE old_status_id = 5;
UPDATE request_history SET old_status_id = 2  WHERE old_status_id = 6;

UPDATE request_history SET new_status_id = 1  WHERE new_status_id = 4;
UPDATE request_history SET new_status_id = 10 WHERE new_status_id = 5;
UPDATE request_history SET new_status_id = 2  WHERE new_status_id = 6;

-- STEP 1D: Now safe to delete the 3 removed statuses.
-- No rows reference them anymore.
DELETE FROM request_status WHERE status_id IN (4, 5, 6);

-- STEP 1E: Rename the kept statuses to your exact naming convention.
UPDATE request_status SET status_name = 'Pending'        WHERE status_id = 1;
UPDATE request_status SET status_name = 'Ready to Claim' WHERE status_id = 2;
UPDATE request_status SET status_name = 'Completed'      WHERE status_id = 3;

-- STEP 1F: Move temp IDs 10,11 down to 4,5.
-- MySQL won't let us just UPDATE a PK if child rows still point to it,
-- so we temporarily disable FK checks, reassign, then re-enable.
SET FOREIGN_KEY_CHECKS = 0;

UPDATE request_status     SET status_id = 4 WHERE status_id = 10;
UPDATE document_request   SET status_id = 4 WHERE status_id = 10;
UPDATE request_history    SET old_status_id = 4 WHERE old_status_id = 10;
UPDATE request_history    SET new_status_id = 4 WHERE new_status_id = 10;

UPDATE request_status     SET status_id = 5 WHERE status_id = 11;
UPDATE document_request   SET status_id = 5 WHERE status_id = 11;
UPDATE request_history    SET old_status_id = 5 WHERE old_status_id = 11;
UPDATE request_history    SET new_status_id = 5 WHERE new_status_id = 11;

SET FOREIGN_KEY_CHECKS = 1;

-- VERIFY: At this point request_status should have exactly:
-- 1=Pending, 2=Ready to Claim, 3=Completed, 4=Forfeited, 5=History
-- Run after: SELECT * FROM request_status;

-- ============================================================
-- SECTION 2: DROP UNUSED TABLES
-- ============================================================

-- admin_contact_information:
--   - 0 rows in DB
--   - No Model file references it
--   - No controller touches it
--   - No frontend API call reaches it
--   Safe to drop.
DROP TABLE IF EXISTS admin_contact_information;

-- password_reset_tokens:
--   - 0 rows in DB
--   - Your auth is fully handled by the external IdP
--   - Laravel's built-in password reset flow is not used
--   Safe to drop.
DROP TABLE IF EXISTS password_reset_tokens;

-- ============================================================
-- SECTION 3: CREATE notification_types TABLE
-- ============================================================
-- Why a separate table?
--   Instead of hardcoding notification messages in PHP,
--   we store the templates here. This means:
--   - Easy to update message wording without a code deploy
--   - Each notification row just references a type_id
--   - You can add new notification types without schema changes
--
-- audience: WHO this notification is for
--   'student_alumni' = sent to the requesting user
--   'admin'          = sent to admin/superadmin users
--   'both'           = sent to everyone relevant
--
-- trigger_event: machine-readable key your Laravel code will use
--   to look up which notification type to fire.
--   e.g. NotificationService::send($userId, 'request_submitted')

CREATE TABLE IF NOT EXISTS notification_types (
  notification_type_id  INT            NOT NULL AUTO_INCREMENT,
  trigger_event         VARCHAR(100)   NOT NULL UNIQUE,
  -- ^ unique slug your PHP code uses to look up the right template
  title                 VARCHAR(255)   NOT NULL,
  -- ^ short heading shown in the bell dropdown
  message_template      TEXT           NOT NULL,
  -- ^ the message body. Use :placeholder syntax for dynamic values
  --   e.g. "Your request #:request_id has been updated."
  audience              ENUM(
                          'student_alumni',
                          'admin',
                          'both'
                        )              NOT NULL DEFAULT 'student_alumni',
  is_active             TINYINT(1)     NOT NULL DEFAULT 1,
  -- ^ lets you disable a notification type without deleting it
  created_at            TIMESTAMP      NULL     DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP      NULL     DEFAULT CURRENT_TIMESTAMP
                                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SECTION 3A: SEED notification_types with your full spec
-- ============================================================

INSERT INTO notification_types
  (trigger_event, title, message_template, audience)
VALUES

-- ── STUDENT / ALUMNI NOTIFICATIONS ──────────────────────────

('request_submitted',
 'Request Submitted',
 'Your document request has been successfully submitted.',
 'student_alumni'),

('payment_verified',
 'Payment Verified',
 'Your payment for request #:request_id has been verified.',
 'student_alumni'),

('payment_invalid',
 'Invalid OR Number',
 'Your OR number for request #:request_id is invalid. Please resubmit.',
 'student_alumni'),

('status_updated',
 'Request Status Updated',
 'Your request status has been updated.',
 'student_alumni'),

('request_processing',
 'Request Being Processed',
 'Your request is being processed.',
 'student_alumni'),

('action_needed',
 'Action Needed',
 'Your request is paused. Please review and correct the missing or incorrect requirements.',
 'student_alumni'),

('ready_to_claim',
 'Ready for Claiming',
 'Your document is ready for claiming.',
 'student_alumni'),

('request_completed',
 'Request Completed',
 'Your document has been successfully claimed. Thank you!',
 'student_alumni'),

('request_forfeited',
 'Request Forfeited',
 'Your request has been forfeited due to unclaimed documents or incomplete requirements.',
 'student_alumni'),

-- ── ADMIN NOTIFICATIONS ──────────────────────────────────────

('admin_new_request',
 'New Request Received',
 'A new document request has been submitted.',
 'admin'),

('admin_payment_verification',
 'Payment Requires Verification',
 'A payment requires verification for request #:request_id.',
 'admin'),

('admin_incomplete_request',
 'Incomplete Request',
 'A request has missing or invalid requirements.',
 'admin'),

('admin_deadline_warning',
 'Deadline Warning',
 'A request is nearing the 90-day claiming deadline.',
 'admin'),

-- ── REMINDER NOTIFICATIONS ───────────────────────────────────

('reminder_claim',
 'Claim Reminder',
 'Reminder: Your document is ready for claiming.',
 'student_alumni'),

('reminder_final_warning',
 'Final Warning Before Forfeiture',
 'Final notice: Your request will be forfeited if not claimed soon.',
 'student_alumni'),

-- ── FINAL STATUS NOTIFICATIONS ───────────────────────────────

('request_closed',
 'Request Closed',
 'Your transaction is now closed.',
 'student_alumni'),

('request_auto_archived',
 'Request Archived',
 'Your request has been archived due to inactivity.',
 'student_alumni');

-- ============================================================
-- SECTION 4: CREATE notifications TABLE
-- ============================================================
-- This is the main table — one row per notification per user.
--
-- Design decisions explained:
--
-- notifiable_type + notifiable_id (polymorphic):
--   Laravel's standard pattern. Instead of a hard FK to users,
--   we store the model class name + ID. This means notifications
--   can be sent to any model in the future (User, AdminProfile, etc.)
--   without schema changes. For now it will always be
--   notifiable_type = 'App\Models\SystemUser'
--
-- data (JSON):
--   Stores dynamic context for the notification.
--   e.g. {"request_id": 42, "old_status": "Pending", "new_status": "Ready to Claim"}
--   This keeps the table flexible — you don't need a new column
--   every time you want to pass extra info to the frontend.
--
-- read_at (nullable timestamp):
--   NULL = unread. Has a value = read (and when it was read).
--   This is the industry standard pattern (used by Laravel itself).
--   Unread count query is just: WHERE read_at IS NULL AND notifiable_id = ?
--
-- deleted_at (soft delete):
--   NULL = active/visible. Has a value = dismissed by user.
--   The row stays in DB for audit trail.
--   Laravel's SoftDeletes trait handles this automatically.
--
-- request_id (nullable FK):
--   Links the notification to a specific document_request when relevant.
--   Nullable because some notifications (e.g. system announcements)
--   aren't tied to a specific request.

CREATE TABLE IF NOT EXISTS notifications (
  id                    CHAR(36)       NOT NULL,
  -- ^ UUID string, not auto-increment integer. Industry standard
  --   for notifications because they're often generated at app
  --   level before being saved (no DB roundtrip needed for the ID).
  --   CHAR(36) stores a UUID like '550e8400-e29b-41d4-a716-446655440000'

  notification_type_id  INT            NOT NULL,
  notifiable_type       VARCHAR(255)   NOT NULL,
  notifiable_id         BIGINT UNSIGNED NOT NULL,
  -- ^ these 2 together = "who is this for"

  data                  JSON           NULL,
  -- ^ dynamic payload (request_id, status names, etc.)

  request_id            INT            NULL,
  -- ^ optional direct link to the document_request

  read_at               TIMESTAMP      NULL DEFAULT NULL,
  -- ^ NULL = unread, timestamp = when it was read

  created_at            TIMESTAMP      NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP      NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            TIMESTAMP      NULL DEFAULT NULL,
  -- ^ soft delete: NULL = visible, timestamp = dismissed

  PRIMARY KEY (id),

  KEY idx_notifiable    (notifiable_type, notifiable_id),
  -- ^ index for "get all notifications for user X" queries

  KEY idx_read_at       (read_at),
  -- ^ index for "get unread count" queries

  KEY idx_deleted_at    (deleted_at),
  -- ^ index for filtering out soft-deleted rows

  KEY idx_request_id    (request_id),
  -- ^ index for "get notifications related to request X"

  KEY idx_created_at    (created_at),
  -- ^ index for ordering by newest first

  CONSTRAINT fk_notif_type
    FOREIGN KEY (notification_type_id)
    REFERENCES notification_types (notification_type_id)
    ON DELETE RESTRICT,
  -- ^ RESTRICT = don't let anyone delete a notification_type
  --   that has sent notifications. Protects audit trail.

  CONSTRAINT fk_notif_request
    FOREIGN KEY (request_id)
    REFERENCES document_request (request_id)
    ON DELETE SET NULL
  -- ^ If a document_request is deleted, keep the notification
  --   but just null out the request_id link.

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DONE — commit everything
-- ============================================================
COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- Run these after the migration to confirm everything is correct.
-- ============================================================

-- Check 1: request_status should have exactly 5 rows
-- SELECT * FROM request_status ORDER BY status_id;

-- Check 2: No document_request rows should reference deleted statuses (4,5,6 old)
-- SELECT COUNT(*) FROM document_request WHERE status_id NOT IN (1,2,3,4,5);

-- Check 3: notification_types should have 17 rows
-- SELECT COUNT(*) FROM notification_types;

-- Check 4: notifications table exists and is empty
-- SELECT COUNT(*) FROM notifications;

-- Check 5: dropped tables should be gone
-- SHOW TABLES LIKE 'admin_contact_information';
-- SHOW TABLES LIKE 'password_reset_tokens';
