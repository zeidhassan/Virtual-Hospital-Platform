// panels.js
let currentPanel = "";

const entityConfig = {
  'appointment-status-logs': ['sort', 'page', 'limit', 'id', 'appointment_id', 'old_status', 'new_status'],
  appointments: ['sort', 'page', 'limit', 'id', 'patient_id', 'doctor_id', 'appointment_date', 'appointment_start_time', 'appointment_end_time', 'status', 'notes'],
  bills: ['sort', 'page', 'limit', 'id', 'patient_id', 'amount', 'status', 'billing_date', 'details'],
  'doctor-plans': ['sort', 'page', 'limit', 'id', 'name', 'description', 'monthly_price', 'yearly_price', 'features', 'currency', 'created_at'],
  'doctor-response-notes': ['sort', 'page', 'limit', 'id', 'doctor_id', 'response_id', 'note', 'created_at'],
  'doctor-subscriptions': ['sort', 'page', 'limit', 'id', 'user_id', 'plan_id', 'billing_cycle', 'status', 'paperwork_url', 'start_date', 'end_date', 'admin_notes', 'created_at', 'updated_at'],
  'doctor-time-slots': ['sort', 'page', 'limit', 'id', 'doctor_id', 'day_of_week', 'start_time', 'end_time'],
  doctors: ['sort', 'page', 'limit', 'id', 'user_id', 'specialization', 'qualifications', 'availability_status', 'profile_picture_url', 'bio'],
  'health-programs': ['sort', 'page', 'limit', 'id', 'name', 'description', 'start_date', 'end_date', 'eligibility'],
  'insurance-requests': ['sort', 'page', 'limit', 'id', 'patient_id', 'doctor_id', 'bill_id', 'insurance_company', 'insurance_id_number', 'start_date', 'end_date', 'status', 'created_at'],
  'medical-records': ['sort', 'page', 'limit', 'id', 'patient_id', 'doctor_id', 'appointment_id', 'record_type', 'description', 'file_url', 'created_at', 'private'],
  medications: ['sort', 'page', 'limit', 'id', 'name', 'type', 'description', 'price'],
  messages: ['sort', 'page', 'limit', 'id', 'sender_id', 'receiver_id', 'message', 'timestamp', 'is_read'],
  notifications: ['sort', 'page', 'limit', 'id', 'user_id', 'title', 'body', 'is_read', 'created_at'],
  'patient-question-responses': ['sort', 'page', 'limit', 'id', 'patient_id', 'question_id', 'answer', 'created_at'],
  patients: ['sort', 'page', 'limit', 'id', 'user_id', 'blood_group', 'emergency_contact_name', 'emergency_contact_phone', 'address', 'allergies', 'chronic_conditions'],
  'pharmacy-orders': ['sort', 'page', 'limit', 'id', 'patient_id', 'medications', 'total_amount', 'status', 'prescription_file', 'ordered_at'],
  plans: ['sort', 'page', 'limit', 'id', 'name', 'description', 'price', 'duration', 'features', 'currency'],
  prescriptions: ['sort', 'page', 'limit', 'id', 'appointment_id', 'medication', 'dosage', 'instructions', 'issued_date'],
  'question-bank': ['sort', 'page', 'limit', 'id', 'question_text', 'question_type', 'specialty', 'suggested_by', 'is_approved', 'created_at'],
  services: ['sort', 'page', 'limit', 'id', 'name', 'description', 'cost'],
  subscriptions: ['sort', 'page', 'limit', 'id', 'patient_id', 'plan_name', 'start_date', 'end_date', 'auto_renew', 'status'],
  'support-tickets': ['sort', 'page', 'limit', 'id', 'user_id', 'subject', 'description', 'status', 'created_at', 'updated_at'],
  'support-ticket-replies': ['sort', 'page', 'limit', 'id', 'ticket_id', 'user_id', 'message', 'file_url', 'doctor_assigned', 'patient_assigned', 'created_at'],
  users: ['sort', 'page', 'limit', 'id', 'full_name', 'email', 'password', 'role', 'phone', 'gender', 'date_of_birth', 'created_at', 'updated_at']
};

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  };
}

function showOutput(data) {
  if (data?.error === 'jwt expired' || data?.error === 'invalid token') {
    alert('Session expired. Please log in again.');
    localStorage.clear();
    window.location.href = 'login.html';
    return;
  }
  const output = document.getElementById('output');
  output.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

function collect(fields) {
  const data = {};
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;

    let val = el.value;
    if (el.type === 'select-one' && (val === 'true' || val === 'false')) {
      val = val === 'true';
    }

    data[f.replace(/Id$/, '')] = val;
  });
  return data;
}

function post(body) {
  return {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  };
}

function put(body) {
  return {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body)
  };
}

function del() {
  return { method: 'DELETE', headers: authHeaders() };
}

function bindPanelEvents(name) {
  const entity = name;
  const fields = entityConfig[entity] || [];
  const panel = document.querySelector('.panel-container');
  if (!panel) return;

  // search event listener
  const searchBtn = document.getElementById(`search-${entity}`);
  if (searchBtn) {
    searchBtn.onclick = async () => {
      const searchIndex = document.getElementById('search')?.value;
      if (!searchIndex) return showOutput({ error: 'Please enter something to search' });
      const searchType = document.getElementById('search-type')?.value || 'name';
      const res = await fetch(`/api/adminBoard/${entity}/search?${searchType}=${encodeURIComponent(searchIndex)}`, {
        headers: authHeaders()
      });
      showOutput(await res.json());
    };
  }

  panel.querySelectorAll('button').forEach(btn => {
    const btnText = btn.textContent.trim();
    if (btnText.startsWith('Get All')) {
      btn.onclick = async () => {
        const page = document.getElementById('page')?.value || 1;
        const sort = document.getElementById('sort')?.value || '+id';
        const limit = document.getElementById('limit')?.value || 10;
        const res = await fetch(`/api/adminBoard/${entity}?page=${page}&limit=${limit}&sort=${encodeURIComponent(sort)}`, { headers: authHeaders() });
        showOutput(await res.json());
      };
    } else if (btnText.startsWith('Get') && btnText.endsWith('by ID')) {
      btn.onclick = async () => {
        const id = document.getElementById('id')?.value;
        if (!id) return showOutput({ error: `${capitalize(entity)} ID required` });
        const res = await fetch(`/api/adminBoard/${entity}/${id}`, { headers: authHeaders() });
        showOutput(await res.json());
      };
    } else if (btnText.startsWith('Create')) {
      btn.onclick = async () => {
        const body = collect(fields.slice(1));
        const res = await fetch(`/api/adminBoard/${entity}`, post(body));
        showOutput(await res.json());
      };
    } else if (btnText.startsWith('Update')) {
      btn.onclick = async () => {
        const id = document.getElementById('id')?.value;
        if (!id) return showOutput({ error: `${capitalize(entity)} ID required` });
        const body = collect(fields.slice(1));
        const res = await fetch(`/api/adminBoard/${entity}/${id}`, put(body));
        showOutput(await res.json());
      };
    } else if (btnText.startsWith('Delete')) {
      btn.onclick = async () => {
        const id = document.getElementById('id')?.value;
        if (!id) return showOutput({ error: `${capitalize(entity)} ID required` });
        const res = await fetch(`/api/adminBoard/${entity}/${id}`, del());
        showOutput(await res.json());
      };
    }
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
