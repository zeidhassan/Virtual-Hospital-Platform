import apiClient from './client';

// Patient: view own requests (by token)
export const getMyInsuranceRequests = (params = {}) =>
  apiClient.get('/insurance-requests/my', { params });

// Patient: submit new request
export const submitInsuranceRequest = (data) =>
  apiClient.post('/insurance-requests', data);

// Patient: check for active (accepted) insurance coverage
export const getActiveInsurance = () =>
  apiClient.get('/insurance-requests/active');

// Patient: persistent insurance policy
export const getMyPolicy = () =>
  apiClient.get('/insurance-requests/policy');

export const saveMyPolicy = (data) =>
  apiClient.post('/insurance-requests/policy', data);

export const cancelMyPolicy = () =>
  apiClient.delete('/insurance-requests/policy');

// Admin: all requests
export const getInsuranceRequests = (params = {}) =>
  apiClient.get('/insurance-requests', { params });

// Doctor or Admin: accept/reject
export const acceptInsuranceRequest = (id) =>
  apiClient.post(`/insurance-requests/${id}/accept`);

export const rejectInsuranceRequest = (id, data = {}) =>
  apiClient.post(`/insurance-requests/${id}/reject`, data);

export const getInsuranceStats = () =>
  apiClient.get('/admin/insurance/stats');
