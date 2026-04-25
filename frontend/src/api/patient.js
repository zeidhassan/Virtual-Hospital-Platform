import apiClient from './client';

// Questions
export const getQuestions = (params = {}) =>
  apiClient.get('/question-bank', { params });

export const submitAnswers = (data) =>
  apiClient.post('/patient-question-responses', data);

export const getMyAnswers = (params = {}) =>
  apiClient.get('/patient-question-responses/my', { params });

// Notifications
export const getNotifications = (params = {}) =>
  apiClient.get('/notifications', { params });

export const markNotificationRead = (id) =>
  apiClient.patch(`/notifications/${id}`, { is_read: true });

// Support tickets (patient)
export const getMySupportTickets = (params = {}) =>
  apiClient.get('/support-tickets/patient', { params });

export const createSupportTicket = (data) =>
  apiClient.post('/support-tickets/patient', data);

export const replyToTicket = (ticketId, data) =>
  apiClient.post(`/support-tickets/patient/${ticketId}/reply`, data);

export const getTicketReplies = (ticketId) =>
  apiClient.get(`/support-tickets/${ticketId}/replies`);
