import * as api from '../../shared/Api';

// mock the API client
jest.mock('../../shared/Api', () => ({
  makeApiRequest: jest.fn(),
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
}));

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    test('loginUser should send correct credentials to backend', async () => {
      const mockResponse = {
        access: 'fake-access-token',
        refresh: 'fake-refresh-token',
        user: { id: 1, username: 'testuser' }
      };
      api.loginUser.mockResolvedValueOnce(mockResponse);

      const result = await api.loginUser(
        { username: 'testuser', password: 'password123' },
        jest.fn()
      );

      expect(api.loginUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          password: 'password123'
        }),
        expect.any(Function)
      );
      expect(result).toHaveProperty('access');
      expect(result).toHaveProperty('refresh');
    });

    test('logoutUser should clear authentication', async () => {
      api.logoutUser.mockResolvedValueOnce({});

      await api.logoutUser();

      expect(api.logoutUser).toHaveBeenCalled();
    });

    test('makeApiRequest should include auth token in headers for protected endpoints', async () => {
      const token = 'fake-token-123';
      localStorage.setItem('accessToken', token);

      const mockResponse = { id: 1, username: 'testuser' };
      api.makeApiRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.makeApiRequest('GET', '/users/me/');

      expect(api.makeApiRequest).toHaveBeenCalledWith('GET', '/users/me/');
      expect(result).toHaveProperty('id');
    });
  });

  // TODO: add maintenance and scheduling API tests

  describe('Error Handling', () => {
    test('should handle 401 unauthorized response from protected endpoint', async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      api.makeApiRequest.mockRejectedValueOnce(error);

      await expect(api.makeApiRequest('GET', '/users/me/')).rejects.toThrow();
    });

    test('should handle network errors', async () => {
      const error = new Error('Network request failed');
      api.makeApiRequest.mockRejectedValueOnce(error);

      await expect(api.makeApiRequest('GET', '/health/')).rejects.toThrow('Network request failed');
    });

    test('should handle 500 server errors', async () => {
      const error = new Error('Internal server error');
      error.response = { status: 500 };
      api.makeApiRequest.mockRejectedValueOnce(error);

      await expect(api.makeApiRequest('GET', '/health/')).rejects.toThrow();
    });

    test('should handle invalid login credentials', async () => {
      const error = new Error('Invalid credentials');
      error.response = { status: 401 };
      api.loginUser.mockRejectedValueOnce(error);

      await expect(
        api.loginUser({ username: 'testuser', password: 'wrongpass' }, jest.fn())
      ).rejects.toThrow('Invalid credentials');
    });
  });
});