import api from './client';

export const getTimeline = (patientId, params = {}) =>
  api.get(`/consultation-history/patient/${patientId}`, { params });

export const getSummary = (patientId) =>
  api.get(`/consultation-history/patient/${patientId}/summary`);
