import apiClient from './client';

export const getProfile = () =>
  apiClient.get('/profile');

export const updateProfile = (data) =>
  apiClient.patch('/profile', data);

export const updateProfilePicture = (formData) =>
  apiClient.patch('/profile/picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
