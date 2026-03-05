-- DROP ALL TABLES IF THEY EXIST
DROP TABLE IF EXISTS users, doctors, patients, appointments, doctor_time_slots, appointment_status_logs, prescriptions, medical_records, bills, plans, subscriptions, messages, notifications, medications, pharmacy_orders, question_bank, patient_question_responses, doctor_response_notes, doctor_plans, doctor_subscriptions, insurance_requests, insurance_requests, support_tickets, services, health_programs, user_passwords CASCADE;

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEEDED DATA
INSERT INTO users (full_name, email, password_hash, role, phone, gender, date_of_birth) VALUES
('Admin User', 'admin@virtualhospitalplatform.com', '$2b$10$Nm6Kfq7exRO4pdpznoK6lOYakzHUg6qWJXaAhv9xmgD77Do//4ksO', 'admin', '1111111111', 'other', '1980-01-01');

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
    instructions TEXT,
    issued_date DATE
);

-- MEDICAL RECORDS TABLE
CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    doctor_id INT REFERENCES doctors(id),
    record_type VARCHAR(50),
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    description TEXT,
    price NUMERIC(10,2) NOT NULL
);

-- SEEDED DATA
INSERT INTO medications (name, description, price) VALUES
('Ibuprofen', 'Pain reliever and anti-inflammatory', 10.00),
('Paracetamol', 'Pain reliever and fever reducer', 8.00),
('Metformin', 'Used to treat type 2 diabetes', 20.00),
('Amoxicillin', 'Antibiotic for bacterial infections', 15.00),
('Vitamin D', 'Vitamin supplement for bone health', 12.00),
('Cetirizine', 'Antihistamine for allergy relief', 9.50),
('Lisinopril', 'Blood pressure medication', 14.00),
('Omeprazole', 'Reduces stomach acid', 11.00);

-- PHARMACY ORDERS TABLE
CREATE TABLE pharmacy_orders (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    medications TEXT NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    prescription_file TEXT,
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

-------------------------------------------------------------------------------------------

-- SUPPORT TICKETS TABLE
CREATE TABLE support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    subject VARCHAR(100),
    description TEXT,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
