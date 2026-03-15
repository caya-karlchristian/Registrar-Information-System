-- ============================================================
-- MIGRATION: registrar_information_system → new schema
-- Date: 2026-03-04
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- STEP 1: Create `roles` table and populate from existing data
-- system_user already has role_id 1, 2, 3 in use
-- ============================================================

CREATE TABLE IF NOT EXISTS `roles` (
  `role_id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_name` VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO `roles` (`role_id`, `role_name`) VALUES
  (1, 'student'),
  (2, 'alumni'),
  (3, 'admin');

-- ============================================================
-- STEP 2: Rename `system_user` → `users` and align columns
-- system_user: user_id, role_id, email, password, remember_token, created_at, updated_at
-- new users:   user_id, role_id, email, password, created_at  (+FK to roles)
-- ============================================================

ALTER TABLE `system_user` RENAME TO `users`;

-- Add FK to roles (role_id already populated correctly)
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role`
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop remember_token (not in new schema)
-- NOTE: If you use password reset features, keep this and add back later.
ALTER TABLE `users` DROP COLUMN `remember_token`;

-- Drop updated_at (not in new schema)
ALTER TABLE `users` DROP COLUMN `updated_at`;

-- Ensure created_at has default
ALTER TABLE `users`
  MODIFY `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Ensure email is UNIQUE and NOT NULL as per new schema
ALTER TABLE `users`
  MODIFY `email` VARCHAR(100) NOT NULL,
  MODIFY `password` VARCHAR(255) NOT NULL,
  ADD UNIQUE KEY `users_email_unique` (`email`);

-- ============================================================
-- STEP 3: Restructure `student_profile`
-- Adds:    suffix, place_of_birth, sex_at_birth
-- Removes: permanent_address, contact_number, created_at
--          (contact info moves to student_contact_information)
-- ============================================================

-- 3a. Add new columns
ALTER TABLE `student_profile`
  ADD COLUMN `suffix` VARCHAR(20) DEFAULT NULL AFTER `last_name`,
  ADD COLUMN `place_of_birth` VARCHAR(150) DEFAULT NULL AFTER `date_of_birth`,
  ADD COLUMN `sex_at_birth` ENUM('Male','Female') NOT NULL DEFAULT 'Male' AFTER `place_of_birth`;

-- 3b. Migrate existing address/contact into student_contact_information (new table)
CREATE TABLE IF NOT EXISTS `student_contact_information` (
  `student_contact_id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_profile_id` INT NOT NULL,
  `mobile_number` VARCHAR(20),
  `personal_email_address` VARCHAR(100),
  `house_unit_number` VARCHAR(50),
  `street` VARCHAR(150),
  `barangay` VARCHAR(150),
  `municipality` VARCHAR(150),
  `province` VARCHAR(150),
  `country` VARCHAR(150),
  FOREIGN KEY (`student_profile_id`) REFERENCES `student_profile`(`student_profile_id`)
    ON DELETE CASCADE
);

-- Migrate existing contact_number and permanent_address into the new table
-- permanent_address is a freeform text, so we store it in street as a best-fit
INSERT INTO `student_contact_information`
  (`student_profile_id`, `mobile_number`, `street`)
SELECT
  `student_profile_id`,
  `contact_number`,
  `permanent_address`
FROM `student_profile`;

-- 3c. Drop migrated + removed columns
ALTER TABLE `student_profile`
  DROP COLUMN `permanent_address`,
  DROP COLUMN `contact_number`,
  DROP COLUMN `created_at`;

-- 3d. Make user_id UNIQUE (1-to-1 with users)
ALTER TABLE `student_profile`
  ADD UNIQUE KEY `uq_student_profile_user_id` (`user_id`);

-- ============================================================
-- STEP 4: Restructure `student_academic_record`
-- Old cols: academic_record_id, student_profile_id, student_number,
--           course, year_level, school_year_admitted,
--           last_school_year_attended, has_honorable_dismissal, graduation_date
-- New cols: student_academic_id (renamed PK), student_profile_id,
--           student_number, school_year_admitted, course,
--           year_level (INT), section, last_school_year_attended
-- Removes:  has_honorable_dismissal, graduation_date
-- ============================================================

-- 4a. Rename PK column
ALTER TABLE `student_academic_record`
  CHANGE `academic_record_id` `student_academic_id` INT NOT NULL AUTO_INCREMENT;

-- 4b. Change year_level from VARCHAR to INT (convert existing data)
ALTER TABLE `student_academic_record`
  MODIFY `year_level` INT DEFAULT NULL;

-- 4c. Add section column
ALTER TABLE `student_academic_record`
  ADD COLUMN `section` VARCHAR(50) DEFAULT NULL AFTER `year_level`;

-- 4d. Drop columns not in new schema
--     NOTE: graduation_date and has_honorable_dismissal are dropped.
--     If you need to preserve this data, export it before running.
ALTER TABLE `student_academic_record`
  DROP COLUMN `has_honorable_dismissal`,
  DROP COLUMN `graduation_date`;

-- 4e. Add UNIQUE on student_number
ALTER TABLE `student_academic_record`
  ADD UNIQUE KEY `uq_student_number` (`student_number`);

-- ============================================================
-- STEP 5: Create alumni tables (all new)
-- ============================================================

CREATE TABLE IF NOT EXISTS `alumni_type` (
  `alumni_type_id` INT AUTO_INCREMENT PRIMARY KEY,
  `alumni_type` VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO `alumni_type` (`alumni_type`) VALUES ('SIS'), ('NON-SIS');

CREATE TABLE IF NOT EXISTS `alumni` (
  `alumni_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `alumni_type_id` INT NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`alumni_type_id`) REFERENCES `alumni_type`(`alumni_type_id`) ON DELETE RESTRICT
);

-- Migrate existing alumni users (role_id = 2) into alumni table
-- They get alumni_type_id = 1 (SIS) by default — update manually if needed
INSERT INTO `alumni` (`user_id`, `alumni_type_id`)
SELECT `user_id`, 1
FROM `users`
WHERE `role_id` = 2;

CREATE TABLE IF NOT EXISTS `alumni_profile` (
  `alumni_profile_id` INT AUTO_INCREMENT PRIMARY KEY,
  `alumni_id` INT NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100),
  `last_name` VARCHAR(100) NOT NULL,
  `suffix` VARCHAR(20),
  `date_of_birth` DATE NOT NULL,
  `place_of_birth` VARCHAR(150),
  `sex_at_birth` ENUM('Male','Female') NOT NULL,
  FOREIGN KEY (`alumni_id`) REFERENCES `alumni`(`alumni_id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `alumni_academic_record` (
  `alumni_academic_id` INT AUTO_INCREMENT PRIMARY KEY,
  `alumni_profile_id` INT NOT NULL,
  `student_number` VARCHAR(50),
  `maiden_name` VARCHAR(150),
  `year_of_graduation` YEAR NOT NULL,
  `course` VARCHAR(100) NOT NULL,
  FOREIGN KEY (`alumni_profile_id`) REFERENCES `alumni_profile`(`alumni_profile_id`) ON DELETE CASCADE
);

-- ============================================================
-- STEP 6: Create admin tables (all new)
-- ============================================================

CREATE TABLE IF NOT EXISTS `admin_profile` (
  `admin_profile_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100),
  `last_name` VARCHAR(100) NOT NULL,
  `suffix` VARCHAR(20),
  `date_of_birth` DATE NOT NULL,
  `place_of_birth` VARCHAR(150),
  `sex_at_birth` ENUM('Male','Female') NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `admin_contact_information` (
  `admin_contact_id` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_profile_id` INT NOT NULL,
  `mobile_number` VARCHAR(20),
  `personal_email_address` VARCHAR(100),
  `house_unit_number` VARCHAR(50),
  `street` VARCHAR(150),
  `barangay` VARCHAR(150),
  `municipality` VARCHAR(150),
  `province` VARCHAR(150),
  `country` VARCHAR(150),
  FOREIGN KEY (`admin_profile_id`) REFERENCES `admin_profile`(`admin_profile_id`) ON DELETE CASCADE
);

-- ============================================================
-- STEP 7: Create `certificate_type` (replaces `certification_types`)
-- Old: cert_type_id, cert_name
-- New: certificate_type_id, certificate_name, + description/requirements/process_period
-- ============================================================

CREATE TABLE IF NOT EXISTS `certificate_type` (
  `certificate_type_id` INT AUTO_INCREMENT PRIMARY KEY,
  `certificate_name` VARCHAR(200) NOT NULL UNIQUE,
  `certificate_description` TEXT,
  `certificate_requirements` TEXT,
  `certificate_process_period` VARCHAR(100)
);

-- Migrate existing certification_types data
INSERT INTO `certificate_type` (`certificate_name`)
SELECT `cert_name` FROM `certification_types`;

-- certification_types will be dropped in cleanup (Step 10)

-- ============================================================
-- STEP 8: Restructure `document_type`
-- Old: document_type_id, document_name, description, requires_clearance
-- New: document_type_id, document_name, document_description,
--      document_requirements, document_process_period
-- ============================================================

ALTER TABLE `document_type`
  CHANGE `description` `document_description` TEXT,
  DROP COLUMN `requires_clearance`,
  ADD COLUMN `document_requirements` TEXT DEFAULT NULL,
  ADD COLUMN `document_process_period` VARCHAR(100) DEFAULT NULL;

-- Add UNIQUE constraint on document_name
ALTER TABLE `document_type`
  ADD UNIQUE KEY `uq_document_name` (`document_name`);

-- ============================================================
-- STEP 9: Restructure `document_request` and related tables
--
-- Removes: purpose_of_request (text) → request_purpose_id (FK)
--          cert_type_id, additional_notes, certification_detail,
--          honors_dismissal_status, receipt_number → or_number
-- Changes: academic_record_id → student_academic_id (renamed FK)
-- ============================================================

-- 9a. Create request_purpose lookup table
CREATE TABLE IF NOT EXISTS `request_purpose` (
  `request_purpose_id` INT AUTO_INCREMENT PRIMARY KEY,
  `purpose_name` VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO `request_purpose` (`purpose_name`) VALUES
  ('DFA'),
  ('Employment - Local'),
  ('Employment - Abroad'),
  ('Further Studies'),
  ('Board Exam'),
  ('Scholarship'),
  ('Personal Copy');

-- 9b. Add new request_purpose_id column (nullable first for migration)
ALTER TABLE `document_request`
  ADD COLUMN `request_purpose_id` INT DEFAULT NULL AFTER `status_id`;

-- 9c. Map existing free-text purpose_of_request to closest purpose_id
--     Exact matches handled; everything else falls back to 'Personal Copy' (id=7)
SET SQL_SAFE_UPDATES = 0;

UPDATE `document_request` dr
JOIN `request_purpose` rp
  ON LOWER(dr.`purpose_of_request`) LIKE CONCAT('%', LOWER(rp.`purpose_name`), '%')
SET dr.`request_purpose_id` = rp.`request_purpose_id`;

-- Fallback: any still-unmapped rows → 'Personal Copy'
UPDATE `document_request`
SET `request_purpose_id` = 7
WHERE `request_purpose_id` IS NULL;

-- 9d. Now enforce NOT NULL and add FK
ALTER TABLE `document_request`
  MODIFY `request_purpose_id` INT NOT NULL,
  ADD CONSTRAINT `fk_dr_purpose`
    FOREIGN KEY (`request_purpose_id`) REFERENCES `request_purpose`(`request_purpose_id`);

-- 9e. Rename receipt_number → or_number
ALTER TABLE `document_request`
  CHANGE `receipt_number` `or_number` VARCHAR(50) DEFAULT NULL;

-- 9f. Rename academic_record_id → student_academic_id to match new PK name
ALTER TABLE `document_request`
  CHANGE `academic_record_id` `student_academic_id` INT NOT NULL;

-- 9g. Drop columns not in new schema
ALTER TABLE `document_request`
  DROP FOREIGN KEY `fk_cert_type`,
  DROP COLUMN `cert_type_id`,
  DROP COLUMN `additional_notes`,
  DROP COLUMN `certification_detail`,
  DROP COLUMN `honors_dismissal_status`,
  DROP COLUMN `purpose_of_request`;

-- 9h. Create request_certificate (many-to-many for certificate types)
CREATE TABLE IF NOT EXISTS `request_certificate` (
  `request_certificate_id` INT AUTO_INCREMENT PRIMARY KEY,
  `request_id` INT NOT NULL,
  `certificate_type_id` INT NOT NULL,
  FOREIGN KEY (`request_id`) REFERENCES `document_request`(`request_id`) ON DELETE CASCADE,
  FOREIGN KEY (`certificate_type_id`) REFERENCES `certificate_type`(`certificate_type_id`) ON DELETE CASCADE
);

-- ============================================================
-- STEP 10: Restructure `request_history`
-- Removes: changed_by (user FK)
-- Renames: history_id → request_history_id, changed_at type tweak
-- ============================================================

ALTER TABLE `request_history`
  DROP FOREIGN KEY `fk_changed_by`,
  DROP KEY `fk_changed_by`,
  DROP COLUMN `changed_by`;

ALTER TABLE `request_history`
  CHANGE `history_id` `request_history_id` INT NOT NULL AUTO_INCREMENT;

ALTER TABLE `request_history`
  MODIFY `changed_at` DATETIME DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- STEP 11: Drop obsolete tables
-- ============================================================

DROP TABLE IF EXISTS `certification_types`;

-- The Laravel default `users` table (empty, different structure) can be dropped
-- since system_user has been renamed to users above.
-- If you never used it, this is safe:
-- DROP TABLE IF EXISTS `users_laravel_default`; -- already handled by rename

-- ============================================================
-- STEP 12: Seed new lookup data (idempotent inserts)
-- ============================================================

-- request_status: add 'Ready' if not present, normalize names
INSERT IGNORE INTO `request_status` (`status_name`) VALUES ('Ready');

-- ============================================================
-- ADD: courses table
-- ============================================================

CREATE TABLE `courses` (
  `course_id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `course_name` VARCHAR(200) NOT NULL UNIQUE
);

INSERT INTO `courses` (`code`, `course_name`) VALUES
('BBA-HRM',    'Bachelor of Science in Business Administration - Human Resource Management'),
('BBA-MM',     'Bachelor of Science in Business Administration - Marketing Management'),
('BSED-ENG',   'Bachelor of Science in Education - English'),
('BSED-MATH',  'Bachelor of Science in Education - Mathematics'),
('BSECE',      'Bachelor of Science in Electronics and Communications Engineering'),
('BSIT',       'Bachelor of Science in Information Technology'),
('BSME',       'Bachelor of Science in Mechanical Engineering'),
('BOA',        'Bachelor of Science in Office Administration'),
('BSPSYCH',    'Bachelor of Science in Psychology'),
('DIT',        'Diploma in Information Technology'),
('DOMT',       'Diploma in Office Management Technology');

-- Link to student_academic_record
ALTER TABLE `student_academic_record`
  ADD COLUMN `course_id` INT DEFAULT NULL AFTER `course`,
  ADD CONSTRAINT `fk_sar_course`
    FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`);

-- Migrate existing free-text course values to course_id
UPDATE `student_academic_record` sar
JOIN `courses` c ON sar.`course` = c.`course_name`
SET sar.`course_id` = c.`course_id`;

-- Once course_id is populated and verified, you can drop the old text column:
-- ALTER TABLE `student_academic_record` DROP COLUMN `course`;


SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- ============================================================
-- DONE
-- ============================================================