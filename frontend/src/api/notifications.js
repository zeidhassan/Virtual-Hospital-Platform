import apiClient from './client';

export const getMyNotifications = (params = {}) =>
  apiClient.get('/notifications/my', { params });

export const getUnreadCount = () =>
  apiClient.get('/notifications/unread-count');

export const markNotificationAsRead = (id) =>
  apiClient.put(`/notifications/${id}/read`);

export const markAllNotificationsAsRead = () =>
  apiClient.put('/notifications/mark-all-read');
