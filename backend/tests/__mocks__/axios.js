const mockAxios = {
  post: jest.fn().mockResolvedValue({
    data: {
      id: 'mock-notification-id',
      recipients: 1,
      errors: []
    }
  }),
  get: jest.fn().mockResolvedValue({
    data: { name: 'MedIntel', id: 'mock-app-id' }
  }),
  patch: jest.fn().mockResolvedValue({ data: { success: true } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true } })
};

module.exports = mockAxios;
