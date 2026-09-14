import apiClient from './client';

export const listPrograms = () => apiClient.get('/health-programs');

export const getMyPrograms = () => apiClient.get('/health-programs/my');

export const enrollProgram = (id) => apiClient.post(`/health-programs/${id}/enroll`);

export const unenrollProgram = (id) => apiClient.delete(`/health-programs/${id}/enroll`);
