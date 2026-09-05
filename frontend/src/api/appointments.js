import apiClient from './client';

export const getMyAppointments = (params = {}) =>
  apiClient.get('/patient/appointments/my-appointments', { params });

export const getDoctorAppointments = (params = {}) =>
  apiClient.get('/doctor/appointments', { params });

export const createDoctorAppointment = (data) =>
  apiClient.post('/doctor/appointments', data);

export const bookAppointment = (data) =>
  apiClient.post('/patient/appointments', data);

export const updateAppointmentStatus = (id, data) =>
  apiClient.put(`/doctor/appointments/${id}/status`, data);

export const rescheduleDoctorAppointment = (id, data) =>
  apiClient.put(`/doctor/appointments/${id}/reschedule`, data);

export const cancelAppointment = (id) =>
  apiClient.put(`/patient/appointments/cancel/${id}`);

export const getSpecializations = () =>
  apiClient.get('/patient/appointments/specializations');

export const getDoctorsBySpecialization = (specialization) =>
  apiClient.get(`/patient/appointments/doctors-by-specialization/${encodeURIComponent(specialization)}`);

export const getDoctorTimeSlots = (doctorId, date) =>
  apiClient.get(`/patient/appointments/doctor-time-slots/${doctorId}`, { params: { date } });
