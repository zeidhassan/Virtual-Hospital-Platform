-- DROP ALL TABLES IF THEY EXIST
DROP TABLE IF EXISTS patient_insurance, payment_transactions, follow_up_schedules, health_logs, triage_sessions, triage_symptom_rules, token_blacklist, users, doctors, patients, billing_addresses, payment_methods, appointments, doctor_time_slots, appointment_status_logs, prescriptions, medical_records, bills, plans, subscriptions, conversations, conversation_participants, messages, notifications, medications, pharmacy_orders, question_bank, patient_question_responses, doctor_response_notes, question_assignments, doctor_plans, doctor_subscriptions, insurance_requests, support_tickets, support_ticket_replies, services, health_programs, user_passwords CASCADE;

-- Needed for the appointments_no_overlap exclusion constraint below (lets a
-- GiST index mix a plain equality column with a range-overlap column).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-------------------------------------------------------------------------------------------

-- USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    gender VARCHAR(10),
    date_of_birth DATE,
    profile_picture_url TEXT,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TOKEN BLACKLIST TABLE (for JWT logout)
CREATE TABLE token_blacklist (
    id SERIAL PRIMARY KEY,
    jti UUID UNIQUE NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    exp TIMESTAMPTZ,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_token_blacklist_exp ON token_blacklist (exp);

-- user_passwords (plaintext password store) was removed — it duplicated
-- users.password_hash in plaintext and was exposed through an admin
-- endpoint. Still dropped above (if it exists) to clean up any database
-- created before this change. Every seeded account below actually logs in
-- with 'admin123' — they share one bcrypt hash — regardless of what this
-- table used to claim.

-- SEEDED DATA - Demo Users (all accounts log in with: admin123)
INSERT INTO users (full_name, email, password_hash, role, phone, gender, date_of_birth) VALUES
('Admin User', 'admin@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'admin', '1111111111', 'other', '1980-01-01'),
('Dr. Stephen Strange', 'strange@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'doctor', '2222222222', 'male', '1975-11-18'),
('Dr. Christine Palmer', 'palmer@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'doctor', '2222222223', 'female', '1980-03-22'),
('Dr. Bruce Banner', 'banner@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'doctor', '2222222224', 'male', '1969-12-18'),
('Jane Smith', 'jane@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'patient', '3333333333', 'female', '1990-05-15'),
('John Doe', 'john@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'patient', '3333333334', 'male', '1985-08-20'),
('Sarah Connor', 'sarah@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'patient', '3333333335', 'female', '1988-11-10'),
('Peter Parker', 'peter@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'patient', '3333333336', 'male', '2001-08-10');

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

-- DEMO DOCTORS DATA
INSERT INTO doctors (user_id, specialization, qualifications, availability_status, bio) VALUES
(2, 'Neurosurgery', 'MD, PhD in Neurosurgery, 15 years experience', 'available', 'Specialized in complex brain and spine surgeries. Former Surgeon General.'),
(3, 'Emergency Medicine', 'MD, Board Certified Emergency Medicine', 'available', 'Expert in trauma care and emergency procedures.'),
(4, 'Endocrinology', 'MD, PhD in Biochemistry, Endocrinology specialist', 'available', 'Specializing in diabetes, thyroid disorders, and metabolic conditions.');

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

-- DEMO PATIENTS DATA
INSERT INTO patients (user_id, blood_group, emergency_contact_name, emergency_contact_phone, address, allergies, chronic_conditions) VALUES
(5, 'O+', 'Mary Smith', '4444444444', '123 Main St, Kuala Lumpur, Malaysia', 'Penicillin', 'Hypertension'),
(6, 'A+', 'Emily Doe', '4444444445', '456 Oak Ave, Penang, Malaysia', 'None', 'None'),
(7, 'B-', 'Kyle Reese', '4444444446', '789 Pine Rd, Johor Bahru, Malaysia', 'Peanuts', 'Asthma'),
(8, 'AB+', 'May Parker', '4444444447', '321 Elm St, Kuala Lumpur, Malaysia', 'None', 'None');

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
  	country_code CHAR(2)      NOT NULL,
  	email        VARCHAR(120),
  	phone        VARCHAR(30),
  	is_default   BOOLEAN DEFAULT FALSE,
  	created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  	updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEMO BILLING ADDRESSES DATA
INSERT INTO billing_addresses (user_id, addr_type, first_name, last_name, line1, city, region, postal_code, country_code, email, phone, is_default) VALUES
(5, 'billing', 'Jane', 'Smith', '123 Main St', 'Kuala Lumpur', 'Wilayah Persekutuan', '50450', 'MY', 'jane@helixacare.com', '3333333333', true),
(6, 'billing', 'John', 'Doe', '456 Oak Ave', 'Penang', 'Penang', '10450', 'MY', 'john@helixacare.com', '3333333334', true),
(7, 'billing', 'Sarah', 'Connor', '789 Pine Rd', 'Johor Bahru', 'Johor', '80000', 'MY', 'sarah@helixacare.com', '3333333335', true);

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

-- DEMO PAYMENT METHODS DATA
INSERT INTO payment_methods (user_id, provider, cardholder_name, brand, last4, exp_month, exp_year, status, is_default) VALUES
(5, 'card', 'Jane Smith', 'Visa', '4242', 12, 2027, 'active', true),
(6, 'card', 'John Doe', 'Mastercard', '5555', 6, 2028, 'active', true),
(7, 'card', 'Sarah Connor', 'Visa', '4111', 9, 2026, 'active', true);

-------------------------------------------------------------------------------------------

-- APPOINTMENTS TABLE
-- Unified appointment module: regular consultations, follow-ups, and scheduled
-- triage escalations are all rows here, distinguished by appointment_type.
-- doctor_id is nullable on purpose — an unassigned follow-up is created
-- with no doctor yet and an admin assigns one later (see
-- adminAppointmentsController.reassignAppointment).
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id),
    doctor_id INT REFERENCES doctors(id),
    appointment_date DATE NOT NULL,
    appointment_start_time TIME,
    appointment_end_time TIME,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'missed')),
    notes TEXT,
    appointment_type VARCHAR(20) DEFAULT 'consultation' CHECK (appointment_type IN ('consultation', 'follow_up', 'triage_escalation')),
    triage_session_id INT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_by INT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_appointments_doctor_date ON appointments (doctor_id, appointment_date);
CREATE INDEX idx_appointments_patient_date ON appointments (patient_id, appointment_date);

-- Belt-and-suspenders against the check-then-write race in
-- checkAppointmentConflict: two concurrent requests can both pass the
-- application-level overlap check before either has written, and double
-- book the same doctor. This makes the database the final word — rows with
-- no start/end time (a date-only follow-up awaiting a slot) don't
-- participate, since an unbounded range would otherwise "overlap" everything.
ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    doctor_id WITH =,
    tsrange(
      (appointment_date + appointment_start_time)::timestamp,
      (appointment_date + appointment_end_time)::timestamp
    ) WITH &&
  ) WHERE (
    status IN ('pending', 'confirmed')
    AND appointment_start_time IS NOT NULL
    AND appointment_end_time IS NOT NULL
  );

-- TIME SLOTS TABLE
CREATE TABLE doctor_time_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INT REFERENCES doctors(id),
    day_of_week VARCHAR(10),
    start_time TIME,
    end_time TIME
);
CREATE INDEX idx_doctor_time_slots_doctor ON doctor_time_slots (doctor_id);

-- APPOINTMENTS STATUS LOG TABLE
CREATE TABLE appointment_status_logs (
    id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEMO APPOINTMENTS DATA
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, status, notes) VALUES
(1, 1, '2026-05-10', '09:00:00', '09:30:00', 'completed', 'Regular checkup - patient doing well'),
(2, 2, '2026-05-12', '10:00:00', '10:30:00', 'completed', 'Emergency consultation - treated and stable'),
(3, 3, '2026-05-15', '14:00:00', '14:30:00', 'confirmed', 'Diabetes follow-up appointment'),
(1, 2, '2026-05-20', '11:00:00', '11:30:00', 'confirmed', 'Follow-up for previous emergency visit'),
(4, 1, '2026-05-08', '15:00:00', '15:30:00', 'completed', 'Initial consultation'),
(2, 3, '2026-05-18', '16:00:00', '16:30:00', 'confirmed', 'Thyroid checkup');

-- DEMO TIME SLOTS DATA
INSERT INTO doctor_time_slots (doctor_id, day_of_week, start_time, end_time) VALUES
(1, 'Monday', '09:00:00', '17:00:00'),
(1, 'Wednesday', '09:00:00', '17:00:00'),
(1, 'Friday', '09:00:00', '13:00:00'),
(2, 'Monday', '08:00:00', '16:00:00'),
(2, 'Tuesday', '08:00:00', '16:00:00'),
(2, 'Thursday', '08:00:00', '16:00:00'),
(3, 'Tuesday', '10:00:00', '18:00:00'),
(3, 'Wednesday', '10:00:00', '18:00:00'),
(3, 'Friday', '10:00:00', '14:00:00');

-- DEMO APPOINTMENT STATUS LOGS DATA
INSERT INTO appointment_status_logs (appointment_id, old_status, new_status) VALUES
(1, 'scheduled', 'completed'),
(2, 'scheduled', 'completed'),
(5, 'scheduled', 'completed');
-------------------------------------------------------------------------------------------

-- PRESCRIPTIONS TABLE
-- medication_id is a deferred FK to medications(id), added after that table exists below.
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(id),
    medication TEXT,
    medication_id INT,
    dosage TEXT,
    pack_limit INT,
    refills_used INT DEFAULT 0,
    instructions TEXT,
    issued_date DATE,
    limit_reached BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_prescriptions_appointment ON prescriptions (appointment_id);

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
CREATE INDEX idx_medical_records_patient ON medical_records (patient_id);

-- DEMO PRESCRIPTIONS DATA
-- medication_id values are literal ids from the medications INSERT further
-- below (Lisinopril=7, Amoxicillin=4, Metformin=3) — safe because the FK
-- itself is only added via ALTER TABLE after that table exists, matching
-- this file's usual deferred-FK pattern.
-- instructions are stored AES-256-GCM encrypted (iv:authTag:ciphertext,
-- matching decrypt() in src/utils/encrypt.js) — these are ciphertext for
-- 'Take with water in the morning' / 'Take with food for 7 days' / 'Take with meals'
INSERT INTO prescriptions (appointment_id, medication_id, dosage, pack_limit, instructions, issued_date, limit_reached) VALUES
(1, 7, '10mg once daily', 3, '274947f277bb72477fd2008e2acca112:7d95c12f269b890e80ef9acd7fb52a69:5211a3239fa6119300d0f0e8856711af671c7e7fcfada0c201aedc6e04e4', '2026-05-10', false),
(2, 4, '500mg three times daily', 2, '9acf484215d97d80d1c33488ba05b429:91ea00b20ae12b1079b9aa5092dbc0e4:a56728adf1b8a9f5ceaf0ef8918425f7d5879b18e6d781088f', '2026-05-12', false),
(5, 3, '500mg twice daily', 3, '6c0874b8d4aee65b730460e5caf857f1:8aff55847bdecd2e59f5ca72ed28c67f:716cccc1742f6f08d4ca31c1eb3219', '2026-05-08', false);

-- DEMO MEDICAL RECORDS DATA
-- record_type values match the app's taxonomy (see allowedRecordTypes in
-- doctorAppointmentsController.js); description is stored AES-256-GCM
-- encrypted (iv:authTag:ciphertext), matching decrypt() on every read path.
INSERT INTO medical_records (patient_id, doctor_id, appointment_id, record_type, description, private) VALUES
(1, 1, 1, 'lab-result', '7a1c440962af8850577ff0d7919dff31:fba72256e493e91d07baaeab650a7131:3f68124eeb1113983abbe1fd21e05353a068d81e303907e1dc4436651032735fdaca6a9bac2625a0622715', false),
(2, 2, 2, 'xray', '38b32203c6e8cffd59cd421f9dce7b14:24bb489f5ea7ebae417ced120f98eff1:d2c8c85e236a8559a31bae3359b67950c12f62b6592837642b62483ed2af3234800a', false),
(4, 1, 5, 'doctor-notes', '703a73f857d2aafdda79bdd227c8f808:c0b74dc7a0fa79e149f960cc8e40affd:f833602b44dba683a06b18447e2d9b04e080ba5fd40ff42aa513cbfe564665664fe455b679e65978a3e46db1885ec8', true),
(3, 3, NULL, 'lab-result', 'e258d2d4ff83d049294d4f0223a20953:33685075321e0b4735add30272c78526:878de90c76e437b9d563bb0d2f076e21079f149f00a28cb8e3d31ff56c4873cbcc9dd98eed', false);

-------------------------------------------------------------------------------------------

-- BILLS TABLE
-- pharmacy_order_id is a deferred FK to pharmacy_orders(id), added after that table exists below.
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    amount NUMERIC(10, 2),
    currency CHAR(3) DEFAULT 'MYR',
    status VARCHAR(20),
    billing_date DATE,
    details TEXT,
    pharmacy_order_id INT
);
CREATE INDEX idx_bills_patient ON bills (patient_id);

-- PLANS TABLE
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    duration_days INT NOT NULL, -- how long the plan lasts
    features TEXT[], -- array of features
    currency VARCHAR(10) DEFAULT 'MYR'
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

-- DEMO BILLS DATA
INSERT INTO bills (patient_id, amount, status, billing_date, details) VALUES
(1, 150.00, 'paid', '2026-05-10', 'Consultation and prescription'),
(2, 200.00, 'paid', '2026-05-12', 'Emergency consultation'),
(3, 120.00, 'pending', '2026-05-15', 'Diabetes screening'),
(4, 100.00, 'paid', '2026-05-08', 'Initial consultation');

-- DEMO SUBSCRIPTIONS DATA
INSERT INTO subscriptions (patient_id, plan_name, start_date, end_date, auto_renew, status) VALUES
(1, 'Basic Health Plan', '2026-05-01', '2026-05-31', true, 'active'),
(2, 'Family Care Plan', '2026-04-01', '2026-06-30', true, 'active'),
(4, 'Premium Health Plan', '2026-03-01', '2026-08-31', false, 'active');

-------------------------------------------------------------------------------------------

-- CONVERSATIONS TABLE
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    is_group BOOLEAN DEFAULT FALSE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CONVERSATION PARTICIPANTS TABLE
CREATE TABLE conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
);

-- MESSAGES TABLE
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INT REFERENCES users(id) ON DELETE SET NULL,
    message TEXT,
    attachment_url TEXT,
    attachment_type VARCHAR(10) CHECK (attachment_type IN ('image', 'pdf')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title VARCHAR(100),
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(50) DEFAULT 'system',
    type VARCHAR(50),
    actor_name VARCHAR(200),
    actor_role VARCHAR(50)
);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read);

-- DEMO CONVERSATIONS DATA
INSERT INTO conversations (title, is_group, created_by) VALUES
('Dr. Strange & Jane Smith', false, 2),
('Dr. Palmer & John Doe', false, 3),
('Medical Team Discussion', true, 1);

-- DEMO CONVERSATION PARTICIPANTS DATA
INSERT INTO conversation_participants (conversation_id, user_id) VALUES
(1, 2), (1, 5),
(2, 3), (2, 6),
(3, 1), (3, 2), (3, 3);

-- DEMO MESSAGES DATA
INSERT INTO messages (conversation_id, sender_id, message) VALUES
(1, 2, 'Hello Jane, how are you feeling after the consultation?'),
(1, 5, 'Much better, thank you Dr. Strange!'),
(2, 3, 'Hi John, please remember to take your medication as prescribed.'),
(2, 6, 'Will do, thanks Dr. Palmer!'),
(3, 1, 'Team, we need to review the new patient intake process.'),
(3, 2, 'Agreed, I have some suggestions.');

-- DEMO NOTIFICATIONS DATA
INSERT INTO notifications (user_id, title, body, is_read) VALUES
(5, 'Appointment Reminder', 'Your appointment with Dr. Strange is tomorrow at 9:00 AM', false),
(6, 'Prescription Ready', 'Your prescription is ready for pickup', true),
(2, 'New Patient Assigned', 'You have been assigned a new patient: Sarah Connor', false),
(3, 'Follow-Up Required', 'Patient John Doe requires a follow-up appointment', false),
(1, 'System Update', 'Platform maintenance scheduled for tonight', true);

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

ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_medication_id_fkey
  FOREIGN KEY (medication_id) REFERENCES medications(id);

UPDATE prescriptions p SET medication_id = m.id
  FROM medications m WHERE m.name = p.medication;

-- PHARMACY ORDERS TABLE
CREATE TABLE pharmacy_orders (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    prescription_id INT REFERENCES prescriptions(id) ON DELETE SET NULL,
    medications TEXT NOT NULL,
    quantities TEXT,
    total_amount NUMERIC(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'MYR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'dispatched', 'delivered', 'cancelled')),
    prescription_file TEXT,
    delivery_address TEXT,
    payment_method VARCHAR(50) DEFAULT 'cash',
    insurance_request_id INT,
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pharmacy_orders_patient ON pharmacy_orders (patient_id);

ALTER TABLE bills ADD CONSTRAINT bills_pharmacy_order_id_fkey
  FOREIGN KEY (pharmacy_order_id) REFERENCES pharmacy_orders(id) ON DELETE SET NULL;

-- DEMO PHARMACY ORDERS DATA
INSERT INTO pharmacy_orders (patient_id, prescription_id, medications, quantities, total_amount, status, delivery_address, payment_method) VALUES
(1, 1, 'Lisinopril', '3', 42.00, 'delivered', '123 Main St, Kuala Lumpur', 'card'),
(2, 2, 'Amoxicillin', '2', 30.00, 'dispatched', '456 Oak Ave, Penang', 'card'),
(4, 3, 'Metformin', '3', 60.00, 'processing', '321 Elm St, Kuala Lumpur', 'cash'),
(3, NULL, 'Vitamin D,Cetirizine', '2,1', 33.50, 'pending', '789 Pine Rd, Johor Bahru', 'card');

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

-- SEEDED DATA
INSERT INTO question_bank (question_text, question_type, is_approved) VALUES
('Do you have a history of diabetes in your family?', 'public', true),
('How often do you exercise per week?', 'public', true),
('Do you take any vitamin supplements regularly?', 'public', true),
('How many servings of fruits and vegetables do you eat daily?', 'public', true),
('Do you have any food allergies?', 'public', true),
('Have you experienced recent weight changes?', 'public', true),
('Do you smoke or consume tobacco products?', 'public', true),
('How much water do you drink daily?', 'public', true),
('Do you have any existing chronic conditions?', 'public', true),
('How many hours of sleep do you get per night?', 'public', true);

-- PATIENT QUESTION RESPONSES TABLE
CREATE TABLE patient_question_responses (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
    question_id INT REFERENCES question_bank(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOCTOR RESPONSE NOTES TABLE
CREATE TABLE doctor_response_notes (
    id SERIAL PRIMARY KEY,
    doctor_id INT REFERENCES doctors(id) ON DELETE CASCADE,
    response_id INT REFERENCES patient_question_responses(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEMO PATIENT QUESTION RESPONSES DATA
INSERT INTO patient_question_responses (patient_id, question_id, answer) VALUES
(1, 1, 'Yes, my father has type 2 diabetes'),
(1, 2, '3 times per week'),
(2, 3, 'Yes, I take Vitamin D daily'),
(2, 5, 'No known food allergies'),
(3, 1, 'No family history of diabetes'),
(3, 9, 'Yes, I have asthma'),
(4, 7, 'No, I do not smoke');

-- DEMO DOCTOR RESPONSE NOTES DATA
INSERT INTO doctor_response_notes (doctor_id, response_id, note) VALUES
(1, 1, 'Monitor blood sugar levels regularly. Consider preventive screening.'),
(3, 3, 'Good practice. Continue with current supplementation.');

-- QUESTION ASSIGNMENTS TABLE — a doctor assigning specific bank questions to a
-- specific patient; response_id fills in once the patient answers it.
CREATE TABLE question_assignments (
    id SERIAL PRIMARY KEY,
    question_id INT NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    response_id INT REFERENCES patient_question_responses(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_question_assignments_patient ON question_assignments(patient_id);

-- DEMO QUESTION ASSIGNMENTS DATA
INSERT INTO question_assignments (question_id, patient_id, doctor_id, response_id) VALUES
(1, 1, 1, 1),
(4, 2, 1, NULL);

-------------------------------------------------------------------------------------------

-- DOCTOR PLANS TABLE
CREATE TABLE doctor_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_price NUMERIC(10,2) NOT NULL,
    yearly_price NUMERIC(10,2) NOT NULL,
    features JSONB NOT NULL,
    currency VARCHAR(10) DEFAULT 'MYR',
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

-- DEMO DOCTOR SUBSCRIPTIONS DATA
INSERT INTO doctor_subscriptions (user_id, plan_id, billing_cycle, status, start_date, end_date) VALUES
(2, 3, 'yearly', 'approved', '2026-01-01', '2026-12-31'),
(3, 2, 'monthly', 'approved', '2026-05-01', '2026-05-31'),
(4, 1, 'monthly', 'pending', NULL, NULL);

-- DEMO PAYMENT TRANSACTIONS DATA
INSERT INTO payment_transactions (user_id, bill_id, amount, method_type, payment_method_id, transaction_ref, status) VALUES
(5, 1, 150.00, 'card', 1, 'TXN-2026-05-10-001', 'success'),
(6, 2, 200.00, 'card', 2, 'TXN-2026-05-12-001', 'success'),
(8, 4, 100.00, 'card', 3, 'TXN-2026-05-08-001', 'success'),
(2, NULL, 899.00, 'card', NULL, 'TXN-2026-01-01-DOC-001', 'success'),
(3, NULL, 59.00, 'card', NULL, 'TXN-2026-05-01-DOC-001', 'success');

-------------------------------------------------------------------------------------------

-- INSURANCE REQUESTS TABLE
CREATE TABLE insurance_requests (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(id),
  doctor_id INT REFERENCES doctors(id),
  bill_id INT REFERENCES bills(id),
  insurance_company VARCHAR(255),
  insurance_id_number VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add FK from pharmacy_orders to insurance_requests (deferred because pharmacy_orders is created earlier)
ALTER TABLE pharmacy_orders ADD CONSTRAINT fk_pharmacy_insurance FOREIGN KEY (insurance_request_id) REFERENCES insurance_requests(id) ON DELETE SET NULL;

-- PATIENT INSURANCE POLICY TABLE (persistent active policy per patient)
CREATE TABLE patient_insurance (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  insurance_company VARCHAR(200) NOT NULL,
  insurance_id_number VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX patient_insurance_one_active ON patient_insurance (patient_id) WHERE is_active = TRUE;

-- DEMO INSURANCE REQUESTS DATA
-- patient_id/doctor_id are patients.id/doctors.id (not users.id) — jane=1, john=2, sarah=3; strange=1, palmer=2, banner=3
INSERT INTO insurance_requests (patient_id, doctor_id, bill_id, insurance_company, insurance_id_number, start_date, end_date, status, reviewed_by) VALUES
(1, 1, 1, 'Malaysia Health Insurance Co.', 'INS-12345', '2026-01-01', '2026-12-31', 'accepted', 1),
(2, 2, 2, 'AsiaCare Insurance Group', 'INS-67890', '2026-01-01', '2026-12-31', 'pending', NULL),
(3, 3, NULL, 'MediLife Malaysia', 'INS-11223', '2026-01-01', '2026-12-31', 'accepted', 1);

-- DEMO PATIENT INSURANCE DATA
INSERT INTO patient_insurance (patient_id, insurance_company, insurance_id_number, start_date, end_date, is_active) VALUES
(1, 'Malaysia Health Insurance Co.', 'INS-12345', '2026-01-01', '2026-12-31', true),
(3, 'MediLife Malaysia', 'INS-11223', '2026-01-01', '2026-12-31', true);

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
    admin_read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SUPPORT TICKET REPLIES TABLE
CREATE TABLE support_ticket_replies (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    message TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEMO SUPPORT TICKETS DATA
INSERT INTO support_tickets (user_id, category, subject, description, status, patient_assigned) VALUES
(5, 'billing', 'Question about my bill', 'I have a question about the charges on my recent bill', 'open', 1),
(6, 'technical', 'Cannot access medical records', 'I am unable to view my medical records in the portal', 'in_progress', 2),
(7, 'appointment', 'Need to reschedule appointment', 'I need to reschedule my appointment for next week', 'resolved', 3);

-- DEMO SUPPORT TICKET REPLIES DATA
INSERT INTO support_ticket_replies (ticket_id, user_id, message) VALUES
(1, 1, 'Thank you for reaching out. Let me review your bill and get back to you shortly.'),
(2, 1, 'We are looking into this issue. Can you please try clearing your browser cache?'),
(2, 6, 'I tried that but still cannot access the records.'),
(3, 1, 'Your appointment has been rescheduled to May 22nd at 2:00 PM.');

-------------------------------------------------------------------------------------------

-- SERVICES TABLE
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    cost NUMERIC(10, 2)
);

--SEEDED DATA
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
CREATE INDEX idx_triage_sessions_patient ON triage_sessions (patient_id);

-- Deferred FK now that triage_sessions exists (see appointments table above)
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_triage_session
    FOREIGN KEY (triage_session_id) REFERENCES triage_sessions(id) ON DELETE SET NULL;

-- follow_up_schedules was removed — superseded by
-- appointments.appointment_type = 'follow_up'; nothing in the app queried it.

-- HEALTH LOGS TABLE
CREATE TABLE health_logs (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    log_type VARCHAR(30) NOT NULL CHECK (log_type IN ('vitals', 'symptom_update', 'medication_adherence', 'general')),
    data JSONB,
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_health_logs_patient ON health_logs (patient_id);

-- DEMO TRIAGE SESSIONS DATA
INSERT INTO triage_sessions (patient_id, symptoms_text, urgency_level, recommended_action, recommended_department, follow_up_recommended, escalated_to_doctor_id) VALUES
(1, 'mild headache and fatigue', 'self_care', 'Rest and treat at home. Monitor for worsening symptoms.', 'Self Care', false, NULL),
(2, 'high fever and severe headache', 'urgent', 'Visit the nearest urgent care clinic or emergency department as soon as possible.', 'Urgent Care', true, 2),
(3, 'chest pain and difficulty breathing', 'emergency', 'Call emergency services immediately. Do not wait.', 'Emergency', true, 1);

-- DEMO FOLLOW-UP DATA — these are appointments with appointment_type = 'follow_up'
-- in the unified module, not a separate table.
INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes, appointment_type, reminder_sent) VALUES
(1, 1, '2026-05-20', 'pending', 'Follow-up for blood pressure check', 'follow_up', false),
(2, 2, '2026-05-19', 'pending', 'Post-emergency consultation follow-up', 'follow_up', true),
(3, 3, '2026-05-22', 'pending', 'Diabetes management follow-up', 'follow_up', false),
(4, NULL, '2026-05-25', 'pending', 'General health checkup - needs doctor assignment', 'follow_up', false),
(1, 2, '2026-05-05', 'completed', 'Completed follow-up visit', 'follow_up', true);

-- DEMO HEALTH LOGS DATA
INSERT INTO health_logs (patient_id, log_type, data, notes) VALUES
(1, 'vitals', '{"blood_pressure": "120/80", "heart_rate": 72, "temperature": 36.6}', 'Morning vitals check'),
(1, 'medication_adherence', '{"medication": "Lisinopril", "taken": true, "time": "08:00"}', 'Took morning medication'),
(2, 'symptom_update', '{"symptom": "headache", "severity": "mild"}', 'Headache improving'),
(3, 'vitals', '{"blood_glucose": 110, "weight": 75}', 'Weekly diabetes monitoring'),
(4, 'general', '{"mood": "good", "energy_level": "high"}', 'Feeling great today');

-------------------------------------------------------------------------------------------

-- Every table with an updated_at column gets it set automatically on
-- UPDATE, instead of each controller having to remember to do it by hand
-- (several didn't, which is exactly how a column meant to track edits ends
-- up reading the same as created_at).
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_billing_addresses_updated_at BEFORE UPDATE ON billing_addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_doctor_subscriptions_updated_at BEFORE UPDATE ON doctor_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patient_insurance_updated_at BEFORE UPDATE ON patient_insurance FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_triage_symptom_rules_updated_at BEFORE UPDATE ON triage_symptom_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-------------------------------------------------------------------------------------------
