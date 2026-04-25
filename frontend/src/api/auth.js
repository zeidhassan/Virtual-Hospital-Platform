import apiClient from './client';

export const login = (credentials) =>
  apiClient.post('/auth/login', credentials);

export const register = (userData) =>
  apiClient.post('/auth/register', userData);

export const logout = () =>
  apiClient.post('/auth/logout');

export const getMe = () =>
  apiClient.get('/auth/me');

export const getProfile = () =>
  apiClient.get('/profile');
