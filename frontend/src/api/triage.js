import apiClient from './client';

// Patient
export const assessTriage = (data) =>
  apiClient.post('/triage/assess', data);

export const getTriageHistory = (params = {}) =>
  apiClient.get('/triage/history', { params });

export const getTriageSession = (id) =>
  apiClient.get(`/triage/session/${id}`);

// Doctor
export const getEscalatedSessions = (params = {}) =>
  apiClient.get('/triage/escalated', { params });

// Admin
export const getAdminSessions = (params = {}) =>
  apiClient.get('/triage/admin/sessions', { params });

export const escalateSession = (id, data) =>
  apiClient.put(`/triage/session/${id}/escalate`, data);

export const getTriageRules = () =>
  apiClient.get('/triage/rules');

export const createTriageRule = (data) =>
  apiClient.post('/triage/rules', data);

export const updateTriageRule = (id, data) =>
  apiClient.put(`/triage/rules/${id}`, data);

export const deleteTriageRule = (id) =>
  apiClient.delete(`/triage/rules/${id}`);
