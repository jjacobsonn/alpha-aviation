/* eslint-disable no-param-reassign */
import axios from 'axios';
import { ACTION_TYPES } from '../context/AppContext';

const setTokens = (accessToken, refreshToken = '') => {
	localStorage.setItem('accessToken', accessToken);
	if (refreshToken !== '') {
		localStorage.setItem('refreshToken', refreshToken);
	}
};

const getTokens = () => {
	const accessTokenString = localStorage.getItem('accessToken');
	const refreshTokenString = localStorage.getItem('refreshToken');
	return { accessToken: accessTokenString, refreshToken: refreshTokenString };
};

class ApiError extends Error {
	constructor({ status, message, data }) {
		super();
		this.status = status;
		this.message = message;
		this.data = data;
	}
}

const forceLogout = () => {
	localStorage.removeItem('accessToken');
	localStorage.removeItem('refreshToken');
	window.location = '/login';
};

const apiClient = axios.create({
	baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
	headers: {
		Accept: 'application/json',
		'Content-Type': 'application/json',
	},
	withCredentials: true,
});

// Request interceptor to add token to every request
apiClient.interceptors.request.use(
	(config) => {
		const tokens = getTokens();
		if (tokens.accessToken) {
			config.headers.Authorization = `Bearer ${tokens.accessToken}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Response interceptor to handle token refresh automatically
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
	failedQueue.forEach((prom) => {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve(token);
		}
	});
	failedQueue = [];
};

apiClient.interceptors.response.use(
	(response) => {
		return response;
	},
	async (error) => {
		const originalRequest = error.config;

		// If error is 401 and we haven't tried to refresh yet
		if (error.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
				// If already refreshing, queue this request
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				})
					.then((token) => {
						originalRequest.headers.Authorization = `Bearer ${token}`;
						return apiClient(originalRequest);
					})
					.catch((err) => {
						return Promise.reject(err);
					});
			}

			originalRequest._retry = true;
			isRefreshing = true;

			const tokens = getTokens();

			if (!tokens.refreshToken) {
				forceLogout();
				return Promise.reject(error);
			}

			try {
				const response = await axios.post(
					`${
						process.env.REACT_APP_API_URL || 'http://localhost:8000/api'
					}/auth/token/refresh/`,
					{ refresh: tokens.refreshToken }
				);

				const { access, refresh } = response.data;
				setTokens(access, refresh);

				apiClient.defaults.headers.common.Authorization = `Bearer ${access}`;
				originalRequest.headers.Authorization = `Bearer ${access}`;

				processQueue(null, access);

				return apiClient(originalRequest);
			} catch (refreshError) {
				processQueue(refreshError, null);
				forceLogout();
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	}
);

const handleApiResponse = (error) => {
	if (error.response) {
		console.warn('API Error Response:', error.response);

		const errorData = error.response.data;
		let errorMessage = 'An error occurred';

		if (typeof errorData === 'string') {
			errorMessage = errorData;
		} else if (errorData.error) {
			errorMessage = errorData.error;
		} else if (errorData.detail) {
			errorMessage = errorData.detail;
		} else if (typeof errorData === 'object') {
			const firstError = Object.values(errorData)[0];
			errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
		}

		throw new ApiError({
			status: error.response.status,
			message: errorMessage,
			data: errorData,
		});
	} else if (error.request) {
		console.warn('API Request Error:', error.request);
		throw new ApiError({
			status: 500,
			message: 'No response received! Please check your connection.',
			data: error.request,
		});
	} else {
		console.warn('API Error:', error.message);
		throw new ApiError({
			status: 500,
			message: 'An unknown error occurred.',
			data: {},
		});
	}
};

export const makeApiRequest = async (
	method,
	url,
	body = null,
	queryParams = {}
) => {
	try {
		const response = await apiClient.request({
			url,
			method,
			params: queryParams,
			data:
				['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && body
					? body
					: undefined,
		});
		return response.data;
	} catch (e) {
		handleApiResponse(e);
	}
};

// ** Login Management **

export const loginUser = async (data, dispatch) => {
	try {
		const loginResponse = await makeApiRequest('POST', '/auth/login/', data);
		setTokens(loginResponse.access, loginResponse.refresh);

		dispatch({
			type: ACTION_TYPES.LOGGED_IN,
			payload: {
				accessToken: loginResponse.access,
				refreshToken: loginResponse.refresh,
			},
		});

		if (loginResponse.user) {
			dispatch({
				type: ACTION_TYPES.UPDATE_USER,
				payload: loginResponse.user,
			});
		}

		return loginResponse;
	} catch (error) {
		console.error('Login failed:', error);
		throw error;
	}
};

export const logoutUser = async () => {
	const tokens = getTokens();
	try {
		await makeApiRequest('POST', '/auth/logout/', {
			refresh: tokens.refreshToken,
		});
	} finally {
		localStorage.removeItem('accessToken');
		localStorage.removeItem('refreshToken');
	}
};

// ** RBAC / Company scoped **

export const fetchCurrentUser = async () => {
	return await makeApiRequest('GET', '/users/me/');
};

export const fetchCompanyInventoriesDetailed = async () => {
	return await makeApiRequest('GET', '/company/inventories/detailed/');
};

export const fetchCompanyLowStockInventoriesDetailed = async () => {
	return await makeApiRequest('GET', '/company/inventories/detailed/low-stock/');
};

export const deleteInventory = async (id) => {
	return await makeApiRequest('DELETE', `/inventories/${id}/`);
};

export const updateInventory = async (id, payload) => {
	return await makeApiRequest('PATCH', `/inventories/${id}/`, payload);
};

export const fetchCompanyWorkorders = async () => {
	return await makeApiRequest('GET', '/company/workorders/');
};

export const fetchCompanyDiscrepancies = async () => {
	return await makeApiRequest('GET', '/company/discrepancies/');
};

export const fetchCompanyUsers = async () => {
	return await makeApiRequest('GET', '/company/users/');
};

export const fetchCompanyAircrafts = async () => {
	return await makeApiRequest('GET', '/company/aircrafts/');
};

export const fetchCompanyFlights = async () => {
	return await makeApiRequest('GET', '/company/flights/');
};
