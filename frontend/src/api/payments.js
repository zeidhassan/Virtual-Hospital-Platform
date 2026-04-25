import apiClient from './client';

export const getFpxBanks = () => apiClient.get('/payments/fpx-banks');
export const getMyBills = () => apiClient.get('/payments/bills/my');
export const payBill = (data) => apiClient.post('/payments/pay', data);
export const getMyTransactions = () => apiClient.get('/payments/transactions');

export const listPaymentMethods = () => apiClient.get('/payments/methods');
export const savePaymentMethod = (data) => apiClient.post('/payments/methods', data);
export const setDefaultMethod = (id) => apiClient.put(`/payments/methods/${id}/default`);
export const deletePaymentMethod = (id) => apiClient.delete(`/payments/methods/${id}`);

export const getBillingAddress = () => apiClient.get('/payments/billing-address');
export const saveBillingAddress = (data) => apiClient.post('/payments/billing-address', data);
