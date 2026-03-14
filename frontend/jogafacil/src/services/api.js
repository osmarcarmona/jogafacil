import { apiConfig, endpoints } from '../config/api';

// Generic API request function
async function apiRequest(url, options = {}) {
  const config = {
    ...apiConfig,
    ...options,
    headers: {
      ...apiConfig.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Students API
export const studentsApi = {
  getAll: (academy) => apiRequest(academy ? `${endpoints.students}?academy=${encodeURIComponent(academy)}` : endpoints.students),
  getById: (id) => apiRequest(`${endpoints.students}/${id}`),
  create: (data) => apiRequest(endpoints.students, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`${endpoints.students}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`${endpoints.students}/${id}`, {
    method: 'DELETE',
  }),
};

// Coaches API
export const coachesApi = {
  getAll: (academy) => apiRequest(academy ? `${endpoints.coaches}?academy=${encodeURIComponent(academy)}` : endpoints.coaches),
  getById: (id) => apiRequest(`${endpoints.coaches}/${id}`),
  create: (data) => apiRequest(endpoints.coaches, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`${endpoints.coaches}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`${endpoints.coaches}/${id}`, {
    method: 'DELETE',
  }),
};

// Teams API
export const teamsApi = {
  getAll: (academy) => apiRequest(academy ? `${endpoints.teams}?academy=${encodeURIComponent(academy)}` : endpoints.teams),
  getById: (id) => apiRequest(`${endpoints.teams}/${id}`),
  create: (data) => apiRequest(endpoints.teams, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`${endpoints.teams}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`${endpoints.teams}/${id}`, {
    method: 'DELETE',
  }),
};

// Places API
export const placesApi = {
  getAll: (academy) => apiRequest(academy ? `${endpoints.places}?academy=${encodeURIComponent(academy)}` : endpoints.places),
  getById: (id) => apiRequest(`${endpoints.places}/${id}`),
  create: (data) => apiRequest(endpoints.places, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`${endpoints.places}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`${endpoints.places}/${id}`, {
    method: 'DELETE',
  }),
};

// Schedule API
export const scheduleApi = {
  getAll: (academy) => apiRequest(academy ? `${endpoints.schedule}?academy=${encodeURIComponent(academy)}` : endpoints.schedule),
  getById: (id) => apiRequest(`${endpoints.schedule}/${id}`),
  create: (data) => apiRequest(endpoints.schedule, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`${endpoints.schedule}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`${endpoints.schedule}/${id}`, {
    method: 'DELETE',
  }),
};

// Academies API
export const academiesApi = {
  getAll: () => apiRequest(endpoints.academies),
  getById: (id) => apiRequest(`${endpoints.academies}/${id}`),
};

// Payment Types API
export const paymentTypesApi = {
  getAll: (academy) => apiRequest(academy ? `${endpoints.paymentTypes}?academy=${encodeURIComponent(academy)}` : endpoints.paymentTypes),
  getById: (id) => apiRequest(`${endpoints.paymentTypes}/${id}`),
  create: (data) => apiRequest(endpoints.paymentTypes, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`${endpoints.paymentTypes}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`${endpoints.paymentTypes}/${id}`, {
    method: 'DELETE',
  }),
};

// Payments API
export const paymentsApi = {
  getAll: (academy) => apiRequest(academy ? `${endpoints.payments}?academy=${encodeURIComponent(academy)}` : endpoints.payments),
  getById: (id) => apiRequest(`${endpoints.payments}/${id}`),
  create: (data) => apiRequest(endpoints.payments, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`${endpoints.payments}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`${endpoints.payments}/${id}`, {
    method: 'DELETE',
  }),
  markPaid: (id, data) => apiRequest(`${endpoints.payments}/${id}/pay`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateHistory: (id, data) => apiRequest(`${endpoints.payments}/${id}/history`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  generate: (data) => apiRequest(`${endpoints.payments}/generate`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
