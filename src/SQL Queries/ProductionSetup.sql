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
('Admin User', 'admin@helixacare.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'admin', '1111111111', 'other', '1980-01-01');

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

-- TIME SLOTS TABLE
CREATE TABLE doctor_time_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INT REFERENCES doctors(id),
    day_of_week VARCHAR(10),
    start_time TIME,
    end_time TIME
);

-- APPOINTMENTS STATUS LOG TABLE
CREATE TABLE appointment_status_logs (
    id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


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

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    title VARCHAR(100),
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
INSERT INTO question_bank (question_text, question_type) VALUES
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

-- SUPPORT TICKET REPLIES TABLE
CREATE TABLE support_ticket_replies (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    message TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- HEALTH LOGS TABLE
CREATE TABLE health_logs (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    log_type VARCHAR(30) NOT NULL CHECK (log_type IN ('vitals', 'symptom_update', 'medication_adherence', 'general')),
    data JSONB,
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------------------------------------------------
