import apiClient from './client';

export const createFollowUp        = (data)         => apiClient.post('/follow-ups', data);
export const getMyFollowUps        = (params = {})  => apiClient.get('/follow-ups/my', { params });
export const getDoctorFollowUps    = (params = {})  => apiClient.get('/follow-ups/doctor', { params });
export const getAdminFollowUps     = (params = {})  => apiClient.get('/follow-ups/admin', { params });
export const completeFollowUp      = (id)           => apiClient.put(`/follow-ups/${id}/complete`);
export const cancelFollowUp        = (id)           => apiClient.put(`/follow-ups/${id}/cancel`);
export const processReminders      = ()             => apiClient.post('/follow-ups/process-reminders');
export const processMissed         = ()             => apiClient.post('/follow-ups/process-missed');
