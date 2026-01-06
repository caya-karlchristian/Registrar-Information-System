CREATE DATABASE registrar_information_system;
USE registrar_information_system;

CREATE TABLE system_user (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL
);

CREATE TABLE request_status (
  status_id INT AUTO_INCREMENT PRIMARY KEY,
  status_name VARCHAR(50) NOT NULL
);

INSERT INTO request_status (status_name)
VALUES ('Pending'), ('Ready to claim'), ('Completed');

CREATE TABLE student_profile (
  student_profile_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  permanent_address TEXT NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES system_user(user_id)
);

CREATE TABLE student_academic_record (
  academic_record_id INT AUTO_INCREMENT PRIMARY KEY,
  student_profile_id INT NOT NULL,
  student_number VARCHAR(50) NOT NULL,
  course VARCHAR(100) NOT NULL,
  year_level VARCHAR(20),
  school_year_admitted VARCHAR(20),
  last_school_year_attended VARCHAR(20),
  FOREIGN KEY (student_profile_id) REFERENCES student_profile(student_profile_id)
);

CREATE TABLE document_type (
  document_type_id INT AUTO_INCREMENT PRIMARY KEY,
  document_name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE document_request (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  student_profile_id INT NOT NULL,
  academic_record_id INT NOT NULL,
  status_id INT NOT NULL,
  purpose_of_request VARCHAR(255) NOT NULL,
  receipt_number VARCHAR(100),
  receipt_date DATE,
  number_of_copies INT NOT NULL,
  additional_notes TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES system_user(user_id),
  FOREIGN KEY (student_profile_id) REFERENCES student_profile(student_profile_id),
  FOREIGN KEY (academic_record_id) REFERENCES student_academic_record(academic_record_id),
  FOREIGN KEY (status_id) REFERENCES request_status(status_id)
);

CREATE TABLE request_document (
  request_document_id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  document_type_id INT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES document_request(request_id),
  FOREIGN KEY (document_type_id) REFERENCES document_type(document_type_id)
);

CREATE TABLE request_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  old_status_id INT NOT NULL,
  new_status_id INT NOT NULL,
  changed_by INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES document_request(request_id)
);

ALTER TABLE student_academic_record 
ADD COLUMN has_honorable_dismissal BOOLEAN DEFAULT FALSE,
ADD COLUMN graduation_date DATE NULL;

ALTER TABLE document_request 
ADD COLUMN certification_detail VARCHAR(255) NULL, -- Stores "please specify" info
ADD COLUMN honors_dismissal_status VARCHAR(50) NULL; -- Stores selection from Step 5

ALTER TABLE document_type 
ADD COLUMN requires_clearance BOOLEAN DEFAULT FALSE;

CREATE TABLE certification_types (
    cert_type_id INT PRIMARY KEY AUTO_INCREMENT,
    cert_name VARCHAR(100) NOT NULL
);

ALTER TABLE document_request 
ADD COLUMN cert_type_id INT,
ADD CONSTRAINT fk_cert_type FOREIGN KEY (cert_type_id) REFERENCES certification_types(cert_type_id);
