import apiClient from './client';

export const getMedicalRecords = (params = {}) =>
  apiClient.get('/patient/records', { params });

export const getMedicalRecordById = (id) =>
  apiClient.get(`/medical-records/${id}`);

export const createMedicalRecord = (data) =>
  apiClient.post('/medical-records', data);

export const updateMedicalRecord = (id, data) =>
  apiClient.patch(`/medical-records/${id}`, data);

export const deleteMedicalRecord = (id) =>
  apiClient.delete(`/medical-records/${id}`);
