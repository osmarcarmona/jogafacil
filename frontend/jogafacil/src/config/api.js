// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiConfig = {
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// API endpoints
export const endpoints = {
  students: `${API_URL}/students`,
  coaches: `${API_URL}/coaches`,
  teams: `${API_URL}/teams`,
  places: `${API_URL}/places`,
  schedule: `${API_URL}/schedule`,
  payments: `${API_URL}/payments`,
  paymentTypes: `${API_URL}/payment-types`,
  academies: `${API_URL}/academies`,
  auth: `${API_URL}/auth`,
  users: `${API_URL}/users`,
  expenses: `${API_URL}/expenses`,
  salaries: `${API_URL}/salaries`,
};

export default apiConfig;
