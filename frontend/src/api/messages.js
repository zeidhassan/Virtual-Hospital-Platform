import api from './client';

export const getConversations = () =>
  api.get('/messages/conversations');

export const getConversationMessages = (conversationId, params = {}) =>
  api.get(`/messages/conversations/${conversationId}/messages`, { params });

export const createConversation = (data) =>
  api.post('/messages/conversations', data);

export const sendMessage = (conversationId, formData) =>
  api.post(`/messages/conversations/${conversationId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const markConversationAsRead = (conversationId) =>
  api.put(`/messages/conversations/${conversationId}/read`);

export const markConversationAsUnread = (conversationId) =>
  api.put(`/messages/conversations/${conversationId}/unread`);

export const setConversationPinned = (conversationId, pinned) =>
  api.put(`/messages/conversations/${conversationId}/pin`, { pinned });

export const addConversationParticipants = (conversationId, userIds) =>
  api.post(`/messages/conversations/${conversationId}/participants`, { user_ids: userIds });

export const removeConversationParticipant = (conversationId, userId) =>
  api.delete(`/messages/conversations/${conversationId}/participants/${userId}`);

export const getAvailableContacts = () =>
  api.get('/messages/contacts');

export const getMessagesUnreadCount = () =>
  api.get('/messages/unread-count');
