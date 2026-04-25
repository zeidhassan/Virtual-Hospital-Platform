-- DROP ALL TABLES IF THEY EXIST
DROP TABLE IF EXISTS payment_transactions, follow_up_schedules, health_logs, triage_sessions, triage_symptom_rules, token_blacklist, users, doctors, patients, billing_addresses, payment_methods, appointments, doctor_time_slots, appointment_status_logs, prescriptions, medical_records, bills, plans, subscriptions, messages, notifications, medications, pharmacy_orders, question_bank, patient_question_responses, doctor_response_notes, doctor_plans, doctor_subscriptions, insurance_requests, support_tickets, support_ticket_replies, services, health_programs, user_passwords CASCADE;

-------------------------------------------------------------------------------------------

-- USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash TEXT,
    role VARCHAR(20),
    phone VARCHAR(20),
    gender VARCHAR(10),
    date_of_birth DATE,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TOKEN BLACKLIST TABLE (for JWT logout)
CREATE TABLE token_blacklist (
    id SERIAL PRIMARY KEY,
    jti UUID UNIQUE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEEDED DATA
INSERT INTO users (full_name, email, password_hash, role, phone, gender, date_of_birth) VALUES
('Admin User', 'admin@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'admin', '1111111111', 'other', '1980-01-01'),
('Dr. Strange', 'strange@helixacare.com', '$2b$10$j8aygi5zKmczoRel7aMf7.d65DTI1KdVinoWnpMr4RiwRdWcURoPm', 'doctor', '2222222222', 'male', '1975-05-10'),
('Jane Patient', 'jane@helixacare.com', '$2b$10$wX7.A1/wNDjPFtN490wLVuM5OHYZsFMmWH9n6EasJTmF1/ETm5lDS', 'patient', '3333333333', 'female', '1990-09-20'),
('Dr. Meredith Grey', 'meredith@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '5555555555', 'female', '1983-02-14'),
('Mark Spencer', 'mark@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '6666666666', 'male', '1988-07-30'),
('Dr. Karev Alex', 'karev@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '7777777777', 'male', '1980-11-05'),
('Claire Bennet', 'claire@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '8888888888', 'female', '1995-06-12'),
('Tom Hardy', 'tom@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '9999999999', 'male', '1992-04-18'),
--Extra test users. Not added in 'patients' or 'doctors'
('User 9', 'user9@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000009', 'male', '1989-10-10'),
('User 10', 'user10@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000010', 'female', '1990-11-11'),
('User 11', 'user11@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000011', 'other', '1991-12-12'),
('User 12', 'user12@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000012', 'male', '1992-01-13'),
('User 13', 'user13@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000013', 'female', '1993-02-14'),
('User 14', 'user14@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000014', 'other', '1994-03-15'),
('User 15', 'user15@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000015', 'male', '1995-04-16'),
('User 16', 'user16@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000016', 'female', '1996-05-17'),
('User 17', 'user17@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000017', 'other', '1997-06-18'),
('User 18', 'user18@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000018', 'male', '1998-07-19'),
('User 19', 'user19@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000019', 'female', '1999-08-20'),
('User 20', 'user20@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000020', 'other', '2000-09-21'),
('User 21', 'user21@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000021', 'male', '2001-10-22'),
('User 22', 'user22@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000022', 'female', '2002-11-23'),
('User 23', 'user23@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000023', 'other', '2003-12-24'),
('User 24', 'user24@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000024', 'male', '2004-01-25'),
('User 25', 'user25@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000025', 'female', '1980-02-26'),
('User 26', 'user26@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000026', 'other', '1981-03-27'),
('User 27', 'user27@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000027', 'male', '1982-04-28'),
('User 28', 'user28@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000028', 'female', '1983-05-01'),
('User 29', 'user29@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000029', 'other', '1984-06-02'),
('User 30', 'user30@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000030', 'male', '1985-07-03'),
('User 31', 'user31@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000031', 'female', '1986-08-04'),
('User 32', 'user32@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000032', 'other', '1987-09-05'),
('User 33', 'user33@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000033', 'male', '1988-10-06'),
('User 34', 'user34@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000034', 'female', '1989-11-07'),
('User 35', 'user35@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000035', 'other', '1990-12-08'),
('User 36', 'user36@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000036', 'male', '1991-01-09'),
('User 37', 'user37@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000037', 'female', '1992-02-10'),
('User 38', 'user38@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000038', 'other', '1993-03-11'),
('User 39', 'user39@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000039', 'male', '1994-04-12'),
('User 40', 'user40@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000040', 'female', '1995-05-13'),
('User 41', 'user41@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000041', 'other', '1996-06-14'),
('User 42', 'user42@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000042', 'male', '1997-07-15'),
('User 43', 'user43@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000043', 'female', '1998-08-16'),
('User 44', 'user44@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000044', 'other', '1999-09-17'),
('User 45', 'user45@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000045', 'male', '2000-10-18'),
('User 46', 'user46@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000046', 'female', '2001-11-19'),
('User 47', 'user47@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000047', 'other', '2002-12-20'),
('User 48', 'user48@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'patient', '1000000048', 'male', '2003-01-21'),
('User 49', 'user49@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'doctor', '1000000049', 'female', '2004-02-22'),
('User 50', 'user50@helixacare.com', '$2b$10$qoLbs5n1ATk1iIKlhy.8m.b/xiw93/zU/E8pKJp3oSy94IxkwsDdC', 'admin', '1000000050', 'other', '1980-03-23');

-- DOCTORS TABLE
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    specialization VARCHAR(100),
    qualifications TEXT,
    availability_status VARCHAR(20),
    profile_picture_url TEXT,
    bio TEXT
);

INSERT INTO doctors (user_id, specialization, qualifications, availability_status, profile_picture_url, bio) VALUES
(2, 'Neurology', 'MD, PhD', 'available', NULL, 'Experienced neurologist.'),
(4, 'Cardiology', 'MD, FACC', 'on_leave', NULL, 'Cardiologist with 10 years experience.'),
(6, 'Pediatrics', 'MD', 'available', NULL, 'Specialist in child healthcare with a focus on preventive care.');

-- PATIENTS TABLE
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    blood_group VARCHAR(5),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    address TEXT,
    allergies TEXT,
    chronic_conditions TEXT
);

INSERT INTO patients (user_id, blood_group, emergency_contact_name, emergency_contact_phone, address, allergies, chronic_conditions) VALUES
(3, 'A+', 'John Doe', '4444444444', '123 Health St.', 'None', 'Asthma'),
(5, 'B-', 'Emily Spencer', '7777777777', '456 Wellness Blvd', 'Peanuts', 'Diabetes'),
(7, 'O+', 'Angela Bennet', '6666666666', '789 Care Ave.', 'Latex', 'None'),
(8, 'AB-', 'Michael Hardy', '5555555555', '321 Vital Rd.', 'None', 'Hypertension');

-------------------------------------------------------------------------------------------

-- BILLING ADDRESSES TABLE
CREATE TABLE billing_addresses (
	id           SERIAL PRIMARY KEY,
	user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  	addr_type    VARCHAR(20) NOT NULL CHECK (addr_type IN ('billing','shipping')),
  	first_name   VARCHAR(80)  NOT NULL,
  	last_name    VARCHAR(80)  NOT NULL,
  	line1        VARCHAR(200) NOT NULL,
  	line2        VARCHAR(200),
  	city         VARCHAR(100) NOT NULL,
  	region       VARCHAR(100),
  	postal_code  VARCHAR(20),
  	country_code CHAR(2)      NOT NULL,   -- e.g. 'US'
  	email        VARCHAR(120),
  	phone        VARCHAR(30),
  	is_default   BOOLEAN DEFAULT FALSE,
  	created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  	updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO billing_addresses (user_id, addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default) VALUES
(1, 'billing',  'John',  'Doe',  '1234 Main St', NULL, 'Los Angeles', 'California', '90001', 'US', 'john.doe@example.com',  '+1-213-555-0100', TRUE),
(1, 'shipping', 'John',  'Doe',  '1234 Main St', 'Apt 2', 'Los Angeles', 'California', '90001', 'US', 'john.doe@example.com', '+1-213-555-0100', TRUE),
(2, 'billing',  'Mary',  'Smith','55 King Rd',   NULL, 'Toronto', 'Ontario', 'M5V2T6', 'CA', 'mary@example.ca', '+1-416-555-0123', TRUE);

-- PAYMENT METHODS TABLE
CREATE TABLE payment_methods (
  	id               SERIAL PRIMARY KEY,
  	user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  	provider         VARCHAR(20) NOT NULL CHECK (provider IN ('card','fpx')),
  	cardholder_name  VARCHAR(120),
  	brand            VARCHAR(20),
  	last4            CHAR(4),
  	exp_month        SMALLINT,
  	exp_year         SMALLINT,
  	status           VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  	is_default       BOOLEAN DEFAULT FALSE,
  	created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  	updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Demo data
INSERT INTO payment_methods (user_id, provider, cardholder_name, brand, last4, exp_month, exp_year, status, is_default)
VALUES (1, 'card', 'John Doe', 'visa', '1111', 12, 2027, 'active', TRUE);

-------------------------------------------------------------------------------------------

-- APPOINTMENTS TABLE
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    doctor_id INT REFERENCES doctors(id),
    appointment_date DATE,
    appointment_start_time TIME,
    appointment_end_time TIME,
    status VARCHAR(20),
    notes TEXT
);

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, status, notes) VALUES
(1, 1, '2025-05-01', '10:00', '10:30', 'confirmed', 'Initial consultation'),
(2, 2, '2025-05-03', '14:00', '14:30', 'pending', 'Follow-up consultation'),
(3, 1, '2025-05-05', '09:30', '10:00', 'confirmed', 'Routine check-up'),
(4, 3, '2025-05-06', '15:45', '16:15', 'cancelled', 'Pediatric exam'),
(1, 3, '2025-05-10', '13:00', '13:30', 'pending', 'Specialist referral discussion'),
(2, 1, '2025-05-11', '08:45', '09:15', 'confirmed', 'Lab results follow-up'),
(4, 1, '2025-05-15', '10:30', '11:00', 'pending', 'Allergy assessment'),
(3, 2, '2025-05-18', '09:00', '09:30', 'confirmed', 'Dietary advice and planning'),
(1, 1, '2025-05-20', '11:00', '11:30', 'completed', 'Completed appointment for integration tests');

-- TIME SLOTS TABLE
CREATE TABLE doctor_time_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INT REFERENCES doctors(id),
    day_of_week VARCHAR(10),
    start_time TIME,
    end_time TIME
);

INSERT INTO doctor_time_slots (doctor_id, day_of_week, start_time, end_time) VALUES
-- Dr. Strange (Doctor ID = 1) - Neurology
(1, 'Monday', '09:00', '09:30'),
(1, 'Monday', '09:30', '10:00'),
(1, 'Monday', '10:00', '10:30'),
(1, 'Monday', '10:30', '11:00'),
(1, 'Monday', '11:00', '11:30'),
(1, 'Monday', '11:30', '12:00'),

(1, 'Wednesday', '13:00', '13:30'),
(1, 'Wednesday', '13:30', '14:00'),
(1, 'Wednesday', '14:00', '14:30'),
(1, 'Wednesday', '14:30', '15:00'),
(1, 'Wednesday', '15:00', '15:30'),
(1, 'Wednesday', '15:30', '16:00'),

-- Dr. Meredith Grey (Doctor ID = 2) - Cardiology
(2, 'Tuesday', '09:00', '09:30'),
(2, 'Tuesday', '09:30', '10:00'),
(2, 'Tuesday', '10:00', '10:30'),
(2, 'Tuesday', '10:30', '11:00'),
(2, 'Tuesday', '11:00', '11:30'),
(2, 'Tuesday', '11:30', '12:00'),

(2, 'Thursday', '13:00', '13:30'),
(2, 'Thursday', '13:30', '14:00'),
(2, 'Thursday', '14:00', '14:30'),
(2, 'Thursday', '14:30', '15:00'),
(2, 'Thursday', '15:00', '15:30'),
(2, 'Thursday', '15:30', '16:00'),

-- Dr. Karev Alex (Doctor ID = 3) - Pediatrics
(3, 'Wednesday', '09:00', '09:30'),
(3, 'Wednesday', '09:30', '10:00'),
(3, 'Wednesday', '10:00', '10:30'),
(3, 'Wednesday', '10:30', '11:00'),
(3, 'Wednesday', '11:00', '11:30'),
(3, 'Wednesday', '11:30', '12:00'),

(3, 'Friday', '13:00', '13:30'),
(3, 'Friday', '13:30', '14:00'),
(3, 'Friday', '14:00', '14:30'),
(3, 'Friday', '14:30', '15:00'),
(3, 'Friday', '15:00', '15:30'),
(3, 'Friday', '15:30', '16:00');

-- APPOINTMENTS STATUS LOG TABLE
CREATE TABLE appointment_status_logs (
    id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO appointment_status_logs (appointment_id, old_status, new_status) VALUES
(1, 'pending', 'confirmed'),
(2, 'pending', 'pending'),
(3, 'pending', 'confirmed'),
(4, 'pending', 'cancelled');

-------------------------------------------------------------------------------------------

-- PRESCRIPTIONS TABLE
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(id),
    medication TEXT,
    dosage TEXT,
    pack_limit INT,
    instructions TEXT,
    issued_date DATE,
    limit_reached BOOLEAN DEFAULT FALSE
);

INSERT INTO prescriptions (appointment_id, medication, dosage, instructions, issued_date) VALUES
(1, 'Ibuprofen', '200mg', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', '2025-05-01'),
(2, 'Metformin', '500mg', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', '2025-05-03'),
(3, 'Amoxicillin', '500mg', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', '2025-05-05'),
(4, 'Cetirizine', '10mg', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', '2025-05-06'),
(5, 'Lisinopril', '10mg', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', '2025-05-08'),
(6, 'Omeprazole', '20mg', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', '2025-05-10'),
(7, 'Paracetamol', '500mg', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', '2025-05-11'),
(8, 'Vitamin D', '1000 IU', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', '2025-05-13');

-- MEDICAL RECORDS TABLE
CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    doctor_id INT REFERENCES doctors(id),
    appointment_id INT REFERENCES appointments(id),
    record_type VARCHAR(50),
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    private BOOL DEFAULT FALSE
);

INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, file_url, private) VALUES
-- Patient Profiles (public)
(1, 1, 1, 'patient-profile', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),
(2, 2, 2, 'medical-history', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),

-- Doctor Notes (private)
(3, 1, 2, 'doctor-notes', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, TRUE),

-- Diagnosis (public/private)
(4, 3, 6, 'diagnosis', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),
(2, 3, 4, 'diagnosis', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, TRUE),

-- Scan/Xray/Radio Reports
(3, 3, 3, 'scan', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),
(1, 1, 1, 'xray', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),
(1, 2, 3, 'radio-reports', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, TRUE),

-- Lab/Blood Test
(1, 1, 1, 'lab-result', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),
(2, 1, 3, 'blood-test', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),
(2, 1, 2, 'blood-readings', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, TRUE),

-- Health Reports & Vaccination
(2, 2, 2, 'health-report', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),
(3, 3, 4, 'vaccination', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),

-- Follow-up/Referral/Prescription
(2, 3, 4, 'follow-up', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),
(3, 2, 1, 'referral', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, TRUE),
(1, 1, 5, 'prescription', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, FALSE),

-- Bill/Payment (private)
(4, 1, 5, 'bill', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, TRUE),
(4, 2, 6, 'payment', '72e4ba61aec1c82b30e7c79a7bb5f5b3:5ab422a8b1d906b5af2402771beecb10', NULL, TRUE);

-------------------------------------------------------------------------------------------

-- BILLS TABLE
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    amount NUMERIC(10, 2),
    status VARCHAR(20),
    billing_date DATE,
    details TEXT
);

INSERT INTO bills (patient_id, amount, status, billing_date, details) VALUES
(1, 150.00, 'paid', '2025-05-01', 'Consultation and medication'),
(2, 200.00, 'pending', '2025-05-03', 'Follow-up consultation and lab test'),
(3, 120.00, 'paid', '2025-05-05', 'Routine check-up and vaccination'),
(4, 300.00, 'pending', '2025-05-06', 'Specialist consultation and tests'),
(1, 95.50, 'paid', '2025-05-11', 'Lab tests and prescription'),
(2, 210.00, 'paid', '2025-05-12', 'Blood pressure monitoring'),
(3, 250.00, 'pending', '2025-05-14', 'Diagnostic imaging and review');

-- PLANS TABLE
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    duration_days INT NOT NULL, -- how long the plan lasts
    features TEXT[], -- array of features
    currency VARCHAR(10) DEFAULT 'SAR'
);

-- SEEDED DATA
INSERT INTO plans (name, description, price, duration_days, features) VALUES
('Basic Health Plan', 'Covers monthly consultations and follow-ups', 99.00, 30, ARRAY['Monthly doctor consults', 'Follow-up reminders']),
('Family Care Plan', 'Healthcare access for up to 5 family members', 299.00, 90, ARRAY['Group consultations', 'Child specialist access']),
('Premium Health Plan', 'All-inclusive premium services and medicine delivery', 499.00, 180, ARRAY['24/7 virtual care', 'Medicine home delivery', 'Lab test discounts']),
('Elderly Care Plan', 'Designed for senior citizens with routine checkups', 199.00, 60, ARRAY['Blood pressure checkups', 'Diabetes monitoring', 'Home visit eligibility']);

-- SUBSCRIPTIONS TABLE
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    plan_name VARCHAR(100),
    start_date DATE,
    end_date DATE,
    auto_renew BOOLEAN,
	status VARCHAR(20) CHECK (status IN ('active', 'insurance_pending', 'cancelled', 'expired')) DEFAULT 'active'
);

INSERT INTO subscriptions (patient_id, plan_name, start_date, end_date, auto_renew) VALUES
(1, 'Basic Health Plan', '2025-04-01', '2025-10-01', TRUE),
(2, 'Premium Health Plan', '2025-04-15', '2026-04-15', FALSE),
(3, 'Family Care Plan', '2025-05-01', '2025-11-01', TRUE),
(4, 'Basic Health Plan', '2025-05-10', '2025-11-10', FALSE);

-------------------------------------------------------------------------------------------

-- MESSAGES TABLE
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(id),
    receiver_id INT REFERENCES users(id),
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

INSERT INTO messages (sender_id, receiver_id, message) VALUES
(2, 3, 'Hello, your test results are ready.'),
(4, 5, 'Please remember to fast before your next blood test.'),
(6, 7, 'Hi Dr. Karev, can we reschedule the appointment?'),
(3, 2, 'Thank you, doctor. I have received the report.'),
(2, 5, 'Your medication is ready for pickup.'),
(7, 6, 'Can I take the new medication with food?'),
(1, 4, 'Reminder: Submit monthly patient review report.'),
(5, 3, 'I have some questions about the dosage.'),
(4, 1, 'Monthly update submitted as requested.'),
(6, 8, 'Please update your contact information during next visit.');

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title VARCHAR(100),
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notifications (user_id, title, body) VALUES
(3, 'Appointment Reminder', 'You have an appointment tomorrow at 10 AM.'),
(5, 'Lab Test Reminder', 'Don’t forget your lab appointment on May 3rd.'),
(2, 'New Patient Assigned', 'You have been assigned a new patient.'),
(4, 'Leave Approved', 'Your leave request from May 5–7 has been approved.'),
(6, 'Schedule Updated', 'Your appointment schedule has been updated.'),
(7, 'Subscription Expiring Soon', 'Your health plan will expire on May 15.'),
(8, 'Medical Record Uploaded', 'A new medical report has been added to your profile.'),
(1, 'System Alert', 'Backup completed successfully.'),
(3, 'Vaccination Reminder', 'Time for your annual flu shot.');

-------------------------------------------------------------------------------------------

-- MEDICATIONS TABLE
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
	type VARCHAR(20) CHECK (type IN ('countertop', 'prescription')),
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    photo_url TEXT
);

-- SEEDED DATA
INSERT INTO medications (name, type, description, price) VALUES
('Ibuprofen', 'countertop', 'Pain reliever and anti-inflammatory', 10.00),
('Paracetamol', 'countertop', 'Pain reliever and fever reducer', 8.00),
('Metformin', 'prescription', 'Used to treat type 2 diabetes', 20.00),
('Amoxicillin', 'prescription', 'Antibiotic for bacterial infections', 15.00),
('Vitamin D', 'countertop', 'Vitamin supplement for bone health', 12.00),
('Cetirizine', 'countertop', 'Antihistamine for allergy relief', 9.50),
('Lisinopril', 'prescription', 'Blood pressure medication', 14.00),
('Omeprazole', 'prescription', 'Reduces stomach acid', 11.00);

-- PHARMACY ORDERS TABLE
CREATE TABLE pharmacy_orders (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    prescription_id INT REFERENCES prescriptions(id) ON DELETE SET NULL,
    medications TEXT NOT NULL,
    quantities TEXT,
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'dispatched', 'delivered', 'cancelled')),
    prescription_file TEXT,
    delivery_address TEXT,
    payment_method VARCHAR(50) DEFAULT 'cash',
    insurance_request_id INT,
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pharmacy_orders (patient_id, medications, total_amount) VALUES
(1, 'Ibuprofen,Paracetamol', 18.00),
(2, 'Metformin', 20.00),
(3, 'Ibuprofen', 10.00),
(1, 'Cetirizine,Ibuprofen', 19.50),
(2, 'Omeprazole,Lisinopril', 25.00),
(3, 'Vitamin D,Amoxicillin', 27.00),
(1, 'Lisinopril', 14.00);

-------------------------------------------------------------------------------------------

-- QUESTION BANK TABLE
CREATE TABLE question_bank (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) CHECK (question_type IN ('public', 'specialty')) NOT NULL,
    specialty VARCHAR(100), -- Nullable for 'public' type
    suggested_by INT REFERENCES doctors(id),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert public questions
INSERT INTO question_bank (question_text, question_type)
VALUES
('Do you have a history of diabetes in your family?', 'public'),
('How often do you exercise per week?', 'public'),
('Do you take any vitamin supplements regularly?', 'public'),
('How many servings of fruits and vegetables do you eat daily?', 'public'),
('Do you have any food allergies?', 'public'),
('Have you experienced recent weight changes?', 'public'),
('Do you smoke or consume tobacco products?', 'public'),
('How much water do you drink daily?', 'public'),
('Do you have any existing chronic conditions?', 'public'),
('How many hours of sleep do you get per night?', 'public');

-- Insert specialty questions
INSERT INTO question_bank (question_text, question_type, specialty)
VALUES
-- Cardiology
('Do you experience chest pain during physical activity?', 'specialty', 'cardiology'),
('Have you ever been diagnosed with high blood pressure?', 'specialty', 'cardiology'),
('Do you have a family history of heart disease?', 'specialty', 'cardiology'),
('Do you experience shortness of breath while resting or walking?', 'specialty', 'cardiology'),
('Have you had an ECG or stress test recently?', 'specialty', 'cardiology'),

-- Dermatology
('Do you experience frequent rashes or itching?', 'specialty', 'dermatology'),
('Have you noticed any new moles or skin growths?', 'specialty', 'dermatology'),
('Do you have a history of eczema or psoriasis?', 'specialty', 'dermatology'),
('Are you allergic to any skincare products or cosmetics?', 'specialty', 'dermatology'),
('Do you use sunscreen regularly?', 'specialty', 'dermatology'),

-- Pediatrics
('Has your child received all recommended vaccinations?', 'specialty', 'pediatrics'),
('Does your child have any food or medication allergies?', 'specialty', 'pediatrics'),
('Has your child had any recent infections or illnesses?', 'specialty', 'pediatrics'),
('Is your child meeting expected growth and development milestones?', 'specialty', 'pediatrics'),
('Does your child sleep well through the night?', 'specialty', 'pediatrics'),

-- Neurology
('Do you suffer from frequent headaches or migraines?', 'specialty', 'neurology'),
('Have you ever experienced seizures or fainting spells?', 'specialty', 'neurology'),
('Do you have difficulty concentrating or remembering things?', 'specialty', 'neurology'),
('Have you had any numbness or tingling in your limbs?', 'specialty', 'neurology'),
('Do you have a history of neurological disorders in your family?', 'specialty', 'neurology'),

-- Endocrinology
('Have you been diagnosed with any thyroid issues?', 'specialty', 'endocrinology'),
('Do you frequently feel tired or sluggish?', 'specialty', 'endocrinology'),
('Do you have symptoms of hormonal imbalance?', 'specialty', 'endocrinology'),
('Have you experienced unexplained weight gain or loss?', 'specialty', 'endocrinology'),
('Do you regularly check your blood sugar levels?', 'specialty', 'endocrinology');

-- PATIENT QUESTION RESPONSES TABLE
CREATE TABLE patient_question_responses (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO patient_question_responses (patient_id, question_id, answer)
VALUES
(3, 1, 'Yes, my father had type 2 diabetes.'),
(3, 2, 'Around twice a week.');

-- DOCTOR RESPONSE NOTES TABLE
CREATE TABLE doctor_response_notes (
    id SERIAL PRIMARY KEY,
    doctor_id INT REFERENCES doctors(id) ON DELETE CASCADE,
    response_id INT REFERENCES patient_question_responses(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO doctor_response_notes (doctor_id, response_id, note)
VALUES
(1, 1, 'Patient should monitor glucose and reduce carb intake.'),
(2, 2, 'Advised to undergo a treadmill ECG for further diagnosis.');

-------------------------------------------------------------------------------------------

-- DOCTOR PLANS TABLE
CREATE TABLE doctor_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_price NUMERIC(10,2) NOT NULL,
    yearly_price NUMERIC(10,2) NOT NULL,
    features JSONB NOT NULL,
    currency VARCHAR(10) DEFAULT 'SAR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEEDED DATA
INSERT INTO doctor_plans (name, description, monthly_price, yearly_price, features)
VALUES 
('Basic', 'Basic doctor plan: text consults only, no file system.', 29.00, 299.00,
 '{
   "file_system_access": false,
   "can_create_questions": true,
   "appointment_stats": false,
   "consultation_type": "text",
   "export_data": false,
   "priority_listing": false,
   "direct_chat": false
 }'::jsonb
),
('Plus', 'Plus doctor plan: file system, video consults, basic stats.', 59.00, 599.00,
 '{
   "file_system_access": true,
   "can_create_questions": true,
   "appointment_stats": "basic",
   "consultation_type": "video",
   "export_data": false,
   "priority_listing": false,
   "direct_chat": false
 }'::jsonb
),
('Premium', 'Premium plan: all features, priority listing, export.', 89.00, 899.00,
 '{
   "file_system_access": true,
   "can_create_questions": true,
   "appointment_stats": "advanced",
   "consultation_type": "video",
   "export_data": true,
   "priority_listing": true,
   "direct_chat": true
 }'::jsonb
);

-- DOCTOR SUBSCRIPTIONS TABLE
CREATE TABLE doctor_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    plan_id INT REFERENCES doctor_plans(id),
    billing_cycle VARCHAR(10) CHECK (billing_cycle IN ('monthly', 'yearly')),
    status VARCHAR(20) DEFAULT 'pending',
    paperwork_url TEXT,
    start_date DATE,
    end_date DATE,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO doctor_subscriptions (user_id, plan_id, billing_cycle, status, paperwork_url, start_date, end_date, admin_notes)
VALUES
(4, 1, 'monthly', 'pending', 'https://storage.example.com/paperwork/mark_spencer.pdf', '2025-06-15', '2026-06-15', NULL),
(2, 2, 'monthly', 'approved', 'https://storage.example.com/paperwork/claire_bennet.pdf', '2025-06-01', '2026-06-01', 'Approved by admin.'),
(6, 3, 'monthly', 'rejected', 'https://storage.example.com/paperwork/tom_hardy.pdf', NULL, NULL, 'Certificate invalid. Please resubmit.');

-- PAYMENT TRANSACTIONS TABLE
CREATE TABLE payment_transactions (
  id                    SERIAL PRIMARY KEY,
  user_id               INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id               INT REFERENCES bills(id) ON DELETE SET NULL,
  doctor_subscription_id INT REFERENCES doctor_subscriptions(id) ON DELETE SET NULL,
  amount                NUMERIC(10,2) NOT NULL,
  currency              CHAR(3) DEFAULT 'MYR',
  method_type           VARCHAR(20) NOT NULL CHECK (method_type IN ('card','fpx')),
  fpx_bank              VARCHAR(50),
  payment_method_id     INT REFERENCES payment_methods(id) ON DELETE SET NULL,
  transaction_ref       VARCHAR(100) NOT NULL UNIQUE,
  status                VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success','failed','pending')),
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------------------------------------------------

-- INSURANCE REQUESTS TABLE
CREATE TABLE insurance_requests (
  id SERIAL PRIMARY KEY,
  patient_id INT REFERENCES users(id),
  doctor_id INT REFERENCES users(id),
  bill_id INT REFERENCES bills(id),
  insurance_company VARCHAR(255),
  insurance_id_number VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO insurance_requests
  (patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date, status)
VALUES
  (1, 2, 1, 'Allianz Saudi Arabia', 'A123456789', '2025-06-01', '2026-06-01', 'pending'),
  (2, 3, 2, 'Bupa Arabia', 'B987654321', '2025-07-01', '2026-07-01', 'accepted'),
  (3, 2, 3, 'Medgulf', 'M555222888', '2025-05-01', '2026-05-01', 'rejected');

-- Add FK from pharmacy_orders to insurance_requests (deferred because pharmacy_orders is created earlier)
ALTER TABLE pharmacy_orders ADD CONSTRAINT fk_pharmacy_insurance FOREIGN KEY (insurance_request_id) REFERENCES insurance_requests(id) ON DELETE SET NULL;

-------------------------------------------------------------------------------------------

-- SUPPORT TICKETS TABLE
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
	category VARCHAR(20),
    subject VARCHAR(100),
    description TEXT,
    status VARCHAR(20),
	file_url TEXT,
    doctor_assigned INT REFERENCES doctors(id) ON DELETE SET NULL,
    patient_assigned INT REFERENCES patients(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO support_tickets (user_id, category, subject, description, status, file_url, doctor_assigned, patient_assigned)
VALUES
(1, 'technical', 'App crashes on login', 'Whenever I try to log in, the app closes unexpectedly.', 'pending', 'uploads/tickets/ticket1-screenshot.png', NULL, NULL),
(2, 'medical', 'Prescription mismatch', 'The prescription in my profile is different from what doctor gave.', 'open', NULL, 1, NULL),
(3, 'billing', 'Overcharged bill', 'I was billed twice for the same appointment.', 'in_progress', 'uploads/tickets/ticket3-bill.png', NULL, NULL),
(4, 'appointments', 'Cannot book appointment', 'The appointment calendar is not loading.', 'resolved', NULL, NULL, 1),
(5, 'other', 'Feedback form issue', 'Feedback form does not allow submission.', 'closed', NULL, NULL, NULL);

-- SUPPORT TICKET REPLIES TABLE
CREATE TABLE support_ticket_replies (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    message TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO support_ticket_replies (ticket_id, user_id, message, file_url)
VALUES
-- Replies to ticket #1
(1, 5, 'We are investigating the crash issue. Can you tell us your phone model?', NULL),
(1, 1, 'Yes, it’s a Samsung Galaxy A52.', NULL),
(1, 5, 'Thanks, our team will push an update soon.', 'uploads/replies/reply1-log.txt'),

-- Replies to ticket #2
(2, 4, 'We apologize for the confusion. Can you upload your physical prescription?', NULL),
(2, 2, 'Sure, here it is.', 'uploads/replies/reply2-prescription.jpg'),

-- Replies to ticket #3
(3, 5, 'We’re reviewing the duplicate charges.', NULL),
(3, 3, 'Thanks, please refund one of them.', NULL),

-- Ticket #4 is resolved with no replies
-- Ticket #5 is closed with one reply
(5, 6, 'We’ve fixed the feedback form issue. Please try again.', NULL);

-------------------------------------------------------------------------------------------

-- SERVICES TABLE
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    cost NUMERIC(10, 2)
);

INSERT INTO services (name, description, cost) VALUES
('General Consultation', 'Basic doctor consultation service', 50.00),
('Diabetes Screening', 'Includes blood test and doctor review', 120.00),
('Cardiology Checkup', 'Heart health evaluation and ECG', 200.00),
('Pediatric Consultation', 'Doctor visit for children under 12', 70.00),
('Allergy Testing', 'Comprehensive allergy panel testing', 150.00),
('Vaccination Service', 'Routine immunizations and boosters', 60.00),
('Nutritional Counseling', 'Diet plan and wellness advice', 90.00),
('Cholesterol Test', 'Blood test to measure cholesterol levels', 80.00),
('Thyroid Function Test', 'Blood test to assess thyroid hormones', 95.00),
('Mental Health Session', 'One-on-one consultation with a counselor', 110.00);

-- HEALTH PROGRAMS TABLE
CREATE TABLE health_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    start_date DATE,
    end_date DATE,
    eligibility TEXT
);

-- SEEDED DATA
INSERT INTO health_programs (name, description, start_date, end_date, eligibility) VALUES
('Heart Health Week', 'Free heart check-ups and awareness program.', '2025-06-01', '2025-06-07', 'All patients'),
('Diabetes Awareness Month', 'Workshops and free screening for diabetes', '2025-11-01', '2025-11-30', 'Adults 40+'),
('Wellness Month', 'Mental health and stress management events.', '2025-07-01', '2025-07-31', 'All users'),
('Child Health Camp', 'Free pediatric check-ups and vaccinations.', '2025-08-10', '2025-08-20', 'Children under 12'),
('Womens Health Week', 'Breast cancer screening and wellness tips.', '2025-10-01', '2025-10-07', 'Women 18+'),
('Flu Vaccination Drive', 'Free flu shots and consultations.', '2025-09-15', '2025-09-30', 'All patients'),
('Senior Wellness Program', 'Fitness and health education for seniors.', '2025-12-01', '2025-12-10', 'Seniors 60+'),
('Cholesterol Check Camp', 'Free lipid profile and consultation.', '2025-05-15', '2025-05-20', 'Adults 30+');

-------------------------------------------------------------------------------------------

-------------------------------------------------------------------------------------------

-- TRIAGE SYMPTOM RULES TABLE
CREATE TABLE triage_symptom_rules (
    id SERIAL PRIMARY KEY,
    urgency_level VARCHAR(20) NOT NULL CHECK (urgency_level IN ('emergency', 'urgent', 'standard', 'self_care')),
    keywords TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    recommended_department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO triage_symptom_rules (urgency_level, keywords, recommended_action, recommended_department) VALUES
('emergency', 'chest pain,difficulty breathing,heart attack,stroke,unconscious,severe bleeding,choking,anaphylaxis,cardiac arrest,stopped breathing', 'Call emergency services immediately. Do not wait.', 'Emergency'),
('urgent', 'high fever,persistent headache,severe headache,difficulty swallowing,sudden confusion,dehydration,broken bone,deep cut,severe abdominal pain,coughing blood', 'Visit the nearest urgent care clinic or emergency department as soon as possible.', 'Urgent Care'),
('standard', 'mild cough,sore throat,runny nose,ear pain,mild fever,diarrhea,vomiting,stomach ache,urinary pain,mild back pain', 'Schedule an appointment with your doctor within 24-48 hours.', 'General Practice'),
('self_care', 'minor cut,mild skin rash,insect bite,minor bruise,slight cold,mild headache,mild fatigue,dry skin,slight nausea', 'Rest and treat at home. Monitor for worsening symptoms.', 'Self Care');

-- TRIAGE SESSIONS TABLE
CREATE TABLE triage_sessions (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    symptoms_text TEXT NOT NULL,
    urgency_level VARCHAR(20) NOT NULL CHECK (urgency_level IN ('emergency', 'urgent', 'standard', 'self_care')),
    recommended_action TEXT,
    recommended_department VARCHAR(100),
    follow_up_recommended BOOLEAN DEFAULT FALSE,
    escalated_to_doctor_id INT REFERENCES doctors(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FOLLOW-UP SCHEDULES TABLE
CREATE TABLE follow_up_schedules (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INT REFERENCES doctors(id) ON DELETE SET NULL,
    appointment_id INT REFERENCES appointments(id) ON DELETE SET NULL,
    triage_session_id INT REFERENCES triage_sessions(id) ON DELETE SET NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'missed')),
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO follow_up_schedules (patient_id, doctor_id, created_by, scheduled_date, notes, status, reminder_sent) VALUES
(1, 1, 2, CURRENT_DATE + INTERVAL '3 days', 'Check blood pressure after medication change', 'pending', FALSE),
(1, 1, 2, CURRENT_DATE - INTERVAL '2 days', 'Post-surgery review (overdue)', 'pending', FALSE),
(1, NULL, NULL, CURRENT_DATE + INTERVAL '7 days', 'Auto follow-up from triage session', 'pending', FALSE);

-- HEALTH LOGS TABLE
CREATE TABLE health_logs (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    log_type VARCHAR(30) NOT NULL CHECK (log_type IN ('vitals', 'symptom_update', 'medication_adherence', 'general')),
    data JSONB,
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO health_logs (patient_id, log_type, data, notes) VALUES
(1, 'vitals', '{"heart_rate": 72, "blood_pressure": "120/80", "temperature": 36.6, "weight_kg": 70}', 'Morning vitals'),
(1, 'symptom_update', '{"symptoms": ["mild headache", "fatigue"], "severity": "mild"}', 'Felt tired after medication'),
(1, 'medication_adherence', '{"medication": "Metformin 500mg", "taken": true, "time": "08:00"}', 'Taken with breakfast'),
(1, 'general', NULL, 'Feeling better overall today');

-------------------------------------------------------------------------------------------

-- PASSWORDS TABLE (Development)
CREATE TABLE user_passwords (
  email VARCHAR(100) PRIMARY KEY,
  password TEXT
);

INSERT INTO user_passwords (email, password) VALUES
('admin@helixacare.com', 'admin123'),
('strange@helixacare.com', 'doctor123'),
('jane@helixacare.com', 'patient123'),
('meredith@helixacare.com', 'password'),
('mark@helixacare.com', 'password'),
('karev@helixacare.com', 'password'),
('claire@helixacare.com', 'password'),
('tom@helixacare.com', 'password');

