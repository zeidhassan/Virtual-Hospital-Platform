import apiClient from './client';

// Doctor's patient list
export const getDoctorPatients = (params = {}) =>
  apiClient.get('/doctor/patients', { params });

// Subscription plans available to doctors
export const getPlans = (params = {}) =>
  apiClient.get('/doctor/subscriptions/plans', { params });

// Doctor subscription (own)
export const getMySubscription = () =>
  apiClient.get('/doctor/subscriptions/current');

export const updateMySubscription = (id, data) =>
  apiClient.put(`/doctor/subscriptions/${id}`, data);

export const subscribeToPlan = (data) =>
  apiClient.post('/doctor/subscriptions/subscribe', data);

// Time slots (own)
export const getMyTimeSlots = (params = {}) =>
  apiClient.get('/doctor/time-slots', { params });

export const createTimeSlot = (data) =>
  apiClient.post('/doctor/time-slots', data);

export const deleteTimeSlot = (id) =>
  apiClient.delete(`/doctor/time-slots/${id}`);

// Patient question responses for this doctor's patients
export const getPatientAnswers = (params = {}) =>
  apiClient.get('/questions/doctor-responses', { params });

// Suggest question
export const suggestQuestion = (data) =>
  apiClient.post('/questions/suggest', data);

// Doctor medical records (records this doctor has created)
export const getDoctorRecords = (params = {}) =>
  apiClient.get('/doctor/records', { params });

// Doctor prescriptions
export const getDoctorPrescriptions = (params = {}) =>
  apiClient.get('/doctor/prescriptions', { params });

// Add a prescription to an appointment
export const addAppointmentPrescription = (appointmentId, data) =>
  apiClient.post(`/doctor/appointments/${appointmentId}/prescriptions`, data);

// Insurance requests assigned to this doctor
export const getDoctorInsurancePending = (params = {}) =>
  apiClient.get('/insurance-requests/doctor-pending', { params });

export const acceptInsurance = (id) =>
  apiClient.post(`/insurance-requests/${id}/accept`);

export const rejectInsurance = (id, data) =>
  apiClient.post(`/insurance-requests/${id}/reject`, data);
