INSERT INTO certification_types (cert_type_id, cert_name) VALUES
(1, 'Certificate of Attendance'),
(2, 'Certificate of Graduation'),
(3, 'Medium of Instruction'),
(4, 'General Weighted Average'),
(5, 'Non-Issuance of Special Order'),
(6, 'Certified True Copy'),
(7, 'Good Moral Character'),
(8, 'Re-Admission Certificate'),
(9, 'Leave of Absence'),
(10, 'Course Accreditation');

INSERT INTO document_type
(document_type_id, document_name, description, requires_clearance)
VALUES

-- =========================
-- COMMON (STUDENT & ALUMNI)
-- =========================
(1, 'Recommendation Letter',
 'Student or Alumni referral and recommendation letter (Service 6)',
 1),

(2, 'Course Subject Description',
 'Official course or subject description',
 1),

(3, 'Certificates',
 'Certificates of Attendance, Graduation, Medium of Instruction, GWA, Non-Issuance of Special Order, Certified True Copy',
 1),

(4, 'CAV / Apostille',
 'Certification, Authentication, Verification (CAV) / Apostille',
 1),

(5, 'Transcript of Records',
 'Official Transcript of Records (TOR)',
 1),

(6, 'Certificate of Good Moral Character',
 'Certificate of Good Moral Character',
 1),

-- =========================
-- ALUMNI-ONLY
-- =========================
(7, 'Academic Verification',
 'Academic verification results requested by a company or agency',
 1),

-- =========================
-- STUDENT-ONLY
-- =========================
(8, 'New Identification Card',
 'Application for new student identification card',
 0),

(9, 'Replacement Identification Card',
 'Replacement of lost student identification card',
 0),

(10, 'Consultation Service',
 'Academic consultation service',
 0),

(11, 'Counseling Service',
 'Student counseling service',
 0),

(12, 'Permit to Conduct an Activity',
 'Permission to conduct an academic or organizational activity',
 0),

(13, 'Application for Graduation',
 'Application or clearance for graduation (SIS and Non-SIS)',
 1),

(14, 'Grade Correction',
 'Correction of entry of grade, completion of incomplete grade, or late reporting of grade',
 1),

(15, 'Name Correction',
 'Correction of name in school records in conformity with Philippine law',
 1),

(16, 'SHS Course Accreditation',
 'Course accreditation from Senior High School to bridge course',
 1),

(17, 'Transferee Course Accreditation',
 'Course accreditation service for transferees',
 1),

(18, 'Informative Copy of Grades',
 'Unofficial informative copy of grades',
 1),

(19, 'Leave of Absence',
 'Approved Leave of Absence (LOA)',
 1),

(20, 'Re-Admission Certificate',
 'Re-admission certificate for returning students',
 1);

INSERT INTO system_user (user_id, role_id) VALUES
(1, 1), -- Student
(2, 2), -- Alumni
(3, 3), -- Registrar Staff
(4, 4); -- Administrator

INSERT INTO student_profile 
(student_profile_id, user_id, first_name, middle_name, last_name, date_of_birth, permanent_address, contact_number, created_at)
VALUES
(1, 1, 'Juan', 'Santos', 'Dela Cruz', '2002-05-14', 'Taguig City', '09171234567', NOW()),
(2, 2, 'Maria', 'Lopez', 'Reyes', '1999-08-21', 'Taguig City', '09179876543', NOW());

INSERT INTO student_academic_record
(academic_record_id, student_profile_id, student_number, course, year_level, school_year_admitted, last_school_year_attended, has_honorable_dismissal, graduation_date)
VALUES
(1, 1, '2022-00001-TG', 'BS Information Technology', '2nd Year', '2022-2023', '2024-2025', 0, NULL),
(2, 2, '2018-04567-TG', 'BS Business Administration', 'Graduate', '2018-2019', '2021-2022', 1, '2022-06-30');

INSERT INTO document_request
(request_id, user_id, student_profile_id, academic_record_id, status_id, purpose_of_request, receipt_number, receipt_date, number_of_copies, additional_notes, requested_at, certification_detail, honors_dismissal_status, cert_type_id)
VALUES
(1, 1, 1, 1, 1, 'Scholarship application', 'OR-2025-0001', '2025-01-05', 2, 'For CHED submission', NOW(), NULL, NULL, 7),
(2, 2, 2, 2, 2, 'Employment requirement', 'OR-2025-0002', '2025-01-03', 1, 'Urgent request', NOW(), 'With Apostille', 'Honorable Dismissal', 6);

INSERT INTO request_document (request_document_id, request_id, document_type_id) VALUES
(1, 1, 20), -- Good Moral Certificate
(2, 2, 16); -- Transcript of Records










