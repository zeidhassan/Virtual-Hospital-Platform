import apiClient from './client';

export const getMedicalRecords = (params = {}) =>
  apiClient.get('/patient/records', { params });

// Patient uploads their own medical record (e.g. an external lab result or document)
export const uploadMedicalRecord = (formData) =>
  apiClient.post('/patient/records', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getMedicalRecordById = (id) =>
  apiClient.get(`/medical-records/${id}`);

export const createMedicalRecord = (data) =>
  apiClient.post('/medical-records', data);

export const updateMedicalRecord = (id, data) =>
  apiClient.patch(`/medical-records/${id}`, data);

export const deleteMedicalRecord = (id) =>
  apiClient.delete(`/medical-records/${id}`);
