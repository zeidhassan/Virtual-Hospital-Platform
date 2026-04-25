import apiClient from './client';

export const getPrescriptions = (params = {}) =>
  apiClient.get('/patient/prescriptions', { params });

export const getPrescriptionById = (id) =>
  apiClient.get(`/prescriptions/${id}`);

export const createPrescription = (data) =>
  apiClient.post('/prescriptions', data);

export const updatePrescription = (id, data) =>
  apiClient.patch(`/prescriptions/${id}`, data);

export const deletePrescription = (id) =>
  apiClient.delete(`/prescriptions/${id}`);
