import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 Unauthorized: clear storage and redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: data => api.post('/auth/register', data),
  login:    data => api.post('/auth/login', data),
  me:       ()   => api.get('/auth/me'),
  updateProfile:   data => api.put('/auth/profile', data),
  deleteProfile: ()   => api.delete('/auth/profile'),
  updatePassword:  data => api.put('/auth/password', data),
};

export const reportsAPI = {
  upload:   formData => api.post('/reports/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll:   params   => api.get('/reports', { params }),
  getOne:   id       => api.get(`/reports/${id}`),
  delete:   id       => api.delete(`/reports/${id}`),
  trends:   ()       => api.get('/reports/trends'),
  compare:  (id1, id2) => api.get(`/reports/compare/${id1}/${id2}`),
  retranslate: (id, language) => api.post(`/ai/retranslate/${id}`, { language }),
  qa:       data     => api.post('/ai/qa', data)
};

export const medicationsAPI = {
  getAll:   params => api.get('/medications', { params }),
  active:   ()     => api.get('/medications/active'),
  create:   data   => api.post('/medications', data),
  update:   (id, data) => api.put(`/medications/${id}`, data),
  delete:   id     => api.delete(`/medications/${id}`),
  markTaken: (id, time) => api.post(`/medications/${id}/taken`, { status: 'taken', scheduledTime: time }),
  schedule: ()     => api.get('/medications/schedule'),
  checkInteractions: () => api.get('/medications/interactions/check')
};

export const symptomsAPI = {
  getAll: params => api.get('/symptoms', { params }),
  create: data   => api.post('/symptoms', data),
  delete: id     => api.delete(`/symptoms/${id}`),
  painTrends: (days) => api.get('/symptoms/trends/pain', { params: { days } }),
  moodTrends: (days) => api.get('/symptoms/trends/mood', { params: { days } })
};

export const timelineAPI = {
  getFull: (params) => api.get('/timeline', { params }),
  getSummary: () => api.get('/timeline/dashboard'), // The Dashboard statistics
  getDoctorSummary: () => api.get('/timeline/summary')
};

export default api;
