import apiClient from './client';

// Patient support tickets API
export const getMySupportTickets = (params = {}) =>
  apiClient.get('/support-tickets/patient', { params });

export const createSupportTicket = (data) =>
  apiClient.post('/support-tickets/patient', data);

export const patientReplyToTicket = (ticketId, data) =>
  apiClient.post(`/support-tickets/patient/${ticketId}/reply`, data);

// Doctor support tickets API
export const getDoctorSupportTickets = (params = {}) =>
  apiClient.get('/support-tickets/doctor', { params });

export const doctorReplyToTicket = (ticketId, data) =>
  apiClient.post(`/support-tickets/doctor/${ticketId}/reply`, data);

// Admin support tickets API
export const getAllSupportTickets = (params = {}) =>
  apiClient.get('/support-tickets/admin', { params });

export const adminReplyToTicket = (ticketId, data) =>
  apiClient.post(`/support-tickets/admin/${ticketId}/reply`, data);

export const adminAssignTicket = (ticketId, data) =>
  apiClient.patch(`/support-tickets/admin/${ticketId}/assign`, data);

// Shared APIs
export const updateTicketStatus = (ticketId, data) =>
  apiClient.patch(`/support-tickets/${ticketId}/status`, data);

export const getTicketReplies = (ticketId, params = {}) =>
  apiClient.get(`/support-tickets/${ticketId}/replies`, { params });
