import apiClient from './client';

export const getMedications = (params = {}) =>
  apiClient.get('/pharmacy-orders/medications/list', { params });

/**
 * Place a pharmacy order.
 * @param {string[]} medicationNames
 * @param {number[]} quantities
 * @param {File|null} file - prescription file (required for Rx meds)
 * @param {string} deliveryAddress
 * @param {string} paymentMethod - 'cash' | 'card' | 'insurance'
 * @param {number|null} insuranceRequestId
 * @param {number|null} prescriptionId - optional linked prescription
 */
export const placeOrder = (medicationNames, quantities, file, deliveryAddress, paymentMethod, insuranceRequestId, prescriptionId) => {
  const formData = new FormData();
  if (file) formData.append('prescription_file', file);
  formData.append('delivery_address', deliveryAddress);
  formData.append('payment_method', paymentMethod);
  if (insuranceRequestId) formData.append('insurance_request_id', insuranceRequestId);
  if (prescriptionId) formData.append('prescription_id', prescriptionId);

  return apiClient.post('/pharmacy-orders', formData, {
    params: {
      medications: medicationNames.join(','),
      quantities: quantities.join(','),
    },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getMyOrders = (params = {}) =>
  apiClient.get('/pharmacy-orders/my', { params });

export const getOrderById = (id) =>
  apiClient.get(`/pharmacy-orders/${id}`);

export const getAllOrders = (params = {}) =>
  apiClient.get('/pharmacy-orders', { params });

// Admin/doctor: update order status — uses PUT to match the backend route
export const updateOrderStatus = (id, new_status) =>
  apiClient.put(`/pharmacy-orders/${id}`, { new_status });

// Patient: cancel a pending order
export const cancelOrder = (id) =>
  apiClient.put(`/pharmacy-orders/${id}/cancel`);
