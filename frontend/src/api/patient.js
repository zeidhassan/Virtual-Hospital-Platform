import apiClient from './client';

// Questions
export const getQuestions = (params = {}) =>
  apiClient.get('/questions/public', { params });

export const submitAnswers = (data) =>
  apiClient.post('/questions/submit-answers', data);

export const getMyAnswers = (params = {}) =>
  apiClient.get('/questions/my-responses', { params });

// Doctor-assigned questions
export const getMyQuestionAssignments = () =>
  apiClient.get('/question-assignments/my');

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
