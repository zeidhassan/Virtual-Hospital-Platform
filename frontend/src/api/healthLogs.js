import apiClient from './client';

export const createHealthLog        = (data)           => apiClient.post('/health-logs', data);
export const getMyHealthLogs        = (params = {})    => apiClient.get('/health-logs/my', { params });
export const getPatientHealthLogs   = (patientId, params = {}) => apiClient.get(`/health-logs/patient/${patientId}`, { params });
