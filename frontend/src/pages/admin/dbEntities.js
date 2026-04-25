// Field helpers
const t   = (name, label, type = 'text')              => ({ name, label, type });
const num = (name, label)                              => ({ name, label, type: 'number' });
const dt  = (name, label)                              => ({ name, label, type: 'date' });
const ti  = (name, label)                              => ({ name, label, type: 'time' });
const ta  = (name, label)                              => ({ name, label, type: 'textarea' });
const sel = (name, label, options)                     => ({ name, label, type: 'select', options });
const bool = (name, label)                             => sel(name, label, ['true', 'false']);

export const ENTITIES = [
  {
    key: 'users',
    label: 'Users',
    fields: [
      t('full_name', 'Full Name'),
      t('email', 'Email', 'email'),
      t('password', 'Password'),
      sel('role', 'Role', ['patient', 'doctor', 'admin']),
      t('phone', 'Phone'),
      sel('gender', 'Gender', ['male', 'female', 'other']),
      dt('date_of_birth', 'Date of Birth'),
    ],
  },
  {
    key: 'doctors',
    label: 'Doctors',
    fields: [
      num('user_id', 'User ID'),
      t('specialization', 'Specialization'),
      ta('qualifications', 'Qualifications'),
      sel('availability_status', 'Availability', ['available', 'unavailable']),
      t('profile_picture_url', 'Profile Picture URL'),
      ta('bio', 'Bio'),
    ],
  },
  {
    key: 'patients',
    label: 'Patients',
    fields: [
      num('user_id', 'User ID'),
      t('blood_group', 'Blood Group'),
      t('emergency_contact_name', 'Emergency Contact Name'),
      t('emergency_contact_phone', 'Emergency Contact Phone'),
      ta('address', 'Address'),
      ta('allergies', 'Allergies'),
      ta('chronic_conditions', 'Chronic Conditions'),
    ],
  },
  {
    key: 'appointments',
    label: 'Appointments',
    fields: [
      num('patient_id', 'Patient ID'),
      num('doctor_id', 'Doctor ID'),
      dt('appointment_date', 'Appointment Date'),
      ti('appointment_start_time', 'Start Time'),
      ti('appointment_end_time', 'End Time'),
      sel('status', 'Status', ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']),
      ta('notes', 'Notes'),
    ],
  },
  {
    key: 'doctor-time-slots',
    label: 'Doctor Time Slots',
    fields: [
      num('doctor_id', 'Doctor ID'),
      sel('day_of_week', 'Day', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
      ti('start_time', 'Start Time'),
      ti('end_time', 'End Time'),
    ],
  },
  {
    key: 'appointment-status-logs',
    label: 'Appt. Status Logs',
    fields: [
      num('appointment_id', 'Appointment ID'),
      t('old_status', 'Old Status'),
      t('new_status', 'New Status'),
    ],
  },
  {
    key: 'prescriptions',
    label: 'Prescriptions',
    fields: [
      num('appointment_id', 'Appointment ID'),
      t('medication', 'Medication'),
      t('dosage', 'Dosage'),
      ta('instructions', 'Instructions'),
      dt('issued_date', 'Issued Date'),
    ],
  },
  {
    key: 'medical-records',
    label: 'Medical Records',
    fields: [
      num('patient_id', 'Patient ID'),
      num('doctor_id', 'Doctor ID'),
      num('appointment_id', 'Appointment ID'),
      t('record_type', 'Record Type'),
      ta('description', 'Description'),
      t('file_url', 'File URL'),
      bool('private', 'Private'),
    ],
  },
  {
    key: 'bills',
    label: 'Bills',
    fields: [
      num('patient_id', 'Patient ID'),
      num('amount', 'Amount'),
      sel('status', 'Status', ['pending', 'paid', 'overdue', 'cancelled']),
      dt('billing_date', 'Billing Date'),
      ta('details', 'Details'),
    ],
  },
  {
    key: 'plans',
    label: 'Plans',
    fields: [
      t('name', 'Name'),
      ta('description', 'Description'),
      num('price', 'Price'),
      num('duration_days', 'Duration (days)'),
      ta('features', 'Features (JSON)'),
      t('currency', 'Currency'),
    ],
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    fields: [
      num('patient_id', 'Patient ID'),
      t('plan_name', 'Plan Name'),
      dt('start_date', 'Start Date'),
      dt('end_date', 'End Date'),
      bool('auto_renew', 'Auto Renew'),
      sel('status', 'Status', ['active', 'cancelled', 'expired']),
    ],
  },
  {
    key: 'messages',
    label: 'Messages',
    fields: [
      num('sender_id', 'Sender ID'),
      num('receiver_id', 'Receiver ID'),
      ta('message', 'Message'),
      bool('is_read', 'Is Read'),
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    fields: [
      num('user_id', 'User ID'),
      t('title', 'Title'),
      ta('body', 'Body'),
      bool('is_read', 'Is Read'),
    ],
  },
  {
    key: 'medications',
    label: 'Medications',
    fields: [
      t('name', 'Name'),
      sel('type', 'Type', ['countertop', 'prescription']),
      ta('description', 'Description'),
      num('price', 'Price'),
    ],
  },
  {
    key: 'pharmacy-orders',
    label: 'Pharmacy Orders',
    fields: [
      num('patient_id', 'Patient ID'),
      t('medications', 'Medications (comma-separated)'),
      num('total_amount', 'Total Amount'),
      sel('status', 'Status', ['pending', 'processing', 'completed', 'cancelled']),
      t('prescription_file', 'Prescription File'),
    ],
  },
  {
    key: 'question-bank',
    label: 'Question Bank',
    fields: [
      ta('question_text', 'Question Text'),
      t('question_type', 'Question Type'),
      t('specialty', 'Specialty'),
      num('suggested_by', 'Suggested By (User ID)'),
      bool('is_approved', 'Is Approved'),
    ],
  },
  {
    key: 'patient-question-responses',
    label: 'Patient Responses',
    fields: [
      num('patient_id', 'Patient ID'),
      num('question_id', 'Question ID'),
      ta('answer', 'Answer'),
    ],
  },
  {
    key: 'doctor-response-notes',
    label: 'Doctor Notes',
    fields: [
      num('doctor_id', 'Doctor ID'),
      num('response_id', 'Response ID'),
      ta('note', 'Note'),
    ],
  },
  {
    key: 'doctor-plans',
    label: 'Doctor Plans',
    fields: [
      t('name', 'Name'),
      ta('description', 'Description'),
      num('monthly_price', 'Monthly Price'),
      num('yearly_price', 'Yearly Price'),
      ta('features', 'Features (JSON)'),
      t('currency', 'Currency'),
    ],
  },
  {
    key: 'doctor-subscriptions',
    label: 'Doctor Subscriptions',
    fields: [
      num('user_id', 'User ID'),
      num('plan_id', 'Plan ID'),
      sel('billing_cycle', 'Billing Cycle', ['monthly', 'yearly']),
      sel('status', 'Status', ['pending', 'approved', 'cancelled', 'expired']),
      t('paperwork_url', 'Paperwork URL'),
      dt('start_date', 'Start Date'),
      dt('end_date', 'End Date'),
      ta('admin_notes', 'Admin Notes'),
    ],
  },
  {
    key: 'insurance-requests',
    label: 'Insurance Requests',
    fields: [
      num('patient_id', 'Patient ID'),
      num('doctor_id', 'Doctor ID'),
      num('bill_id', 'Bill ID'),
      t('insurance_company', 'Insurance Company'),
      t('insurance_id_number', 'Insurance ID Number'),
      dt('start_date', 'Start Date'),
      dt('end_date', 'End Date'),
      sel('status', 'Status', ['pending', 'approved', 'rejected', 'accepted']),
    ],
  },
  {
    key: 'support-tickets',
    label: 'Support Tickets',
    fields: [
      num('user_id', 'User ID'),
      t('subject', 'Subject'),
      ta('description', 'Description'),
      sel('status', 'Status', ['open', 'in-progress', 'closed']),
    ],
  },
  {
    key: 'support-ticket-replies',
    label: 'Ticket Replies',
    fields: [
      num('ticket_id', 'Ticket ID'),
      num('user_id', 'User ID'),
      ta('message', 'Message'),
      t('file_url', 'File URL'),
      num('doctor_assigned', 'Doctor Assigned (ID)'),
      num('patient_assigned', 'Patient Assigned (ID)'),
    ],
  },
  {
    key: 'services',
    label: 'Services',
    fields: [
      t('name', 'Name'),
      ta('description', 'Description'),
      num('cost', 'Cost'),
    ],
  },
  {
    key: 'health-programs',
    label: 'Health Programs',
    fields: [
      t('name', 'Name'),
      ta('description', 'Description'),
      dt('start_date', 'Start Date'),
      dt('end_date', 'End Date'),
      ta('eligibility', 'Eligibility'),
    ],
  },
];
