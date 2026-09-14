import apiClient from './client';

// Stats & Charts
export const getStatsByRole = () =>
  apiClient.get('/admin/stats/users-by-role');

export const getStatsAppointments = (params = {}) =>
  apiClient.get('/admin/stats/appointments', { params });

export const getStatsAppointmentsMonthly = () =>
  apiClient.get('/admin/stats/appointments-monthly');

export const getStatsPrescriptions = () =>
  apiClient.get('/admin/stats/prescriptions');

export const getStatsPharmacyOrders = () =>
  apiClient.get('/admin/stats/pharmacy-orders');

export const getStatsRevenue = () =>
  apiClient.get('/admin/stats/revenue');

export const getStatsSubscriptions = () =>
  apiClient.get('/admin/stats/subscriptions');

export const getChartTopDoctors = (params = {}) =>
  apiClient.get('/admin/charts/top-doctors', { params });

export const getChartTopMedications = (params = {}) =>
  apiClient.get('/admin/charts/top-medications', { params });

export const getChartSubscriptionDistribution = (params = {}) =>
  apiClient.get('/admin/charts/subscription-distribution', { params });

// Billing
export const getBills = (params = {}) =>
  apiClient.get('/admin/billing', { params });

export const updateBill = (id, data) =>
  apiClient.put(`/payments/bills/${id}`, data);

// Appointments (admin)
export const getAdminAppointments = (params = {}) =>
  apiClient.get('/admin/appointments', { params });

export const updateAdminAppointment = (id, data) =>
  apiClient.patch(`/admin/appointments/${id}`, data);

export const deleteAdminAppointment = (id) =>
  apiClient.delete(`/admin/appointments/${id}`);

export const reassignAdminAppointment = (id, data) =>
  apiClient.put(`/admin/appointments/${id}/reassign`, data);

export const getAdminAvailableTimeSlots = (doctorId, date) =>
  apiClient.get('/admin/appointments/available-time-slots', { params: { doctorId, date } });

export const createAdminAppointment = (data) =>
  apiClient.post('/admin/appointments', data);

export const sendAdminAppointmentReminder = (id) =>
  apiClient.post(`/admin/appointments/${id}/remind`);

// Doctor list (for reassign / scheduling modals)
export const getAllDoctors = (params = {}) =>
  apiClient.get('/admin/doctor-time-slots', { params: { list_only: true, limit: 200, ...params } });

// Patient list (for follow-up create/filter pickers) — reuses the existing,
// already admin-gated database-admin-board route, which already returns
// full_name per row.
export const getAllPatientsForPicker = (params = {}) =>
  apiClient.get('/adminBoard/patients', { params: { limit: 500, sort: '+id', ...params } });

// Doctor subscriptions
export const getDoctorSubscriptions = (params = {}) =>
  apiClient.get('/adminBoard/doctor-subscriptions', { params });

export const updateDoctorSubscription = (id, data) =>
  apiClient.put(`/adminBoard/doctor-subscriptions/${id}`, data);

export const getDoctorSubscriptionStats = () =>
  apiClient.get('/admin/doctor-plans/subscription-stats');

// Doctor plans CRUD
export const getAdminPlans = () =>
  apiClient.get('/adminBoard/doctor-plans');

export const createAdminPlan = (data) =>
  apiClient.post('/adminBoard/doctor-plans', data);

export const updateAdminPlan = (id, data) =>
  apiClient.put(`/adminBoard/doctor-plans/${id}`, data);

export const deleteAdminPlan = (id) =>
  apiClient.delete(`/adminBoard/doctor-plans/${id}`);

// Doctor time slots (admin view)
export const getDoctorTimeSlots = (params = {}) =>
  apiClient.get('/admin/doctor-time-slots', { params });

export const createDoctorTimeSlot = (data) =>
  apiClient.post('/admin/doctor-time-slots', data);

export const deleteDoctorTimeSlot = (id) =>
  apiClient.delete(`/admin/doctor-time-slots/${id}`);

// Questions
export const getQuestions = (params = {}) =>
  apiClient.get('/admin/questions', { params });

export const approveQuestion = (id) =>
  apiClient.put(`/admin/questions/${id}/approve`);

export const deleteQuestion = (id) =>
  apiClient.delete(`/admin/questions/${id}`);

// Question assignments (read-only overview)
export const getQuestionAssignmentsOverview = (params = {}) =>
  apiClient.get('/question-assignments/admin', { params });
