import apiClient from './client';

// Patient: view own requests (by token)
export const getMyInsuranceRequests = (params = {}) =>
  apiClient.get('/insurance-requests/my', { params });

// Patient: submit new request
export const submitInsuranceRequest = (data) =>
  apiClient.post('/insurance-requests', data);

// Admin: all requests
export const getInsuranceRequests = (params = {}) =>
  apiClient.get('/insurance-requests', { params });

export const createInsuranceRequest = (data) =>
  apiClient.post('/insurance-requests', data);

export const updateInsuranceRequest = (id, data) =>
  apiClient.patch(`/insurance-requests/${id}`, data);

export const getInsuranceStats = () =>
  apiClient.get('/insurance-requests/stats');

// Patient: check for active (accepted) insurance coverage
export const getActiveInsurance = () =>
  apiClient.get('/insurance-requests/active');
