import apiClient from './client';

const base = (entity) => `/adminBoard/${entity}`;

export const abGetAll  = (entity, params = {}) => apiClient.get(base(entity), { params });
export const abGetById = (entity, id)          => apiClient.get(`${base(entity)}/${id}`);
export const abCreate  = (entity, data)        => apiClient.post(base(entity), data);
export const abUpdate  = (entity, id, data)    => apiClient.put(`${base(entity)}/${id}`, data);
export const abDelete  = (entity, id)          => apiClient.delete(`${base(entity)}/${id}`);
