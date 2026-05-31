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
	baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api',
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
		// Custom header triggers CORS preflight; skip auth endpoints so login works
		// even if older backend CORS config omitted x-company-id.
		const path = String(config.url || '');
		const isAuthPath = path.includes('/auth/');
		const adminCompanyId = localStorage.getItem('adminCompanyId');
		// Company list/detail must not be scoped by tenant header (admin needs all orgs).
		const skipCompanyHeader =
			config.skipCompanyScope === true ||
			(config.method === 'get' && /^\/companies\/?$/.test(path));
		if (adminCompanyId && !isAuthPath && !skipCompanyHeader) {
			config.headers['X-Company-Id'] = adminCompanyId;
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
						process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api'
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
	queryParams = {},
	options = {}
) => {
	try {
		const response = await apiClient.request({
			url,
			method,
			params: queryParams,
			skipCompanyScope: options.skipCompanyScope === true,
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

/** Self-service profile fields allowed by PATCH /users/me/ */
export const patchCurrentUser = async (payload) => {
	return await makeApiRequest('PATCH', '/users/me/', payload);
};

export const fetchCompanyInventoriesDetailed = async () => {
	const data = await makeApiRequest('GET', '/company/inventories/detailed/');
	if (Array.isArray(data)) return data;
	if (data && Array.isArray(data.results)) return data.results;
	return [];
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

export const fetchGlobalSearch = async (q) => {
	return await makeApiRequest('GET', '/search/', null, { q });
};

export const fetchAnalyticsMaintenance = async (queryParams = {}) => {
	return await makeApiRequest('GET', '/analytics/maintenance/', null, queryParams);
};

export const fetchAnalyticsFleetPerformance = async (queryParams = {}) => {
	return await makeApiRequest('GET', '/analytics/fleet-performance/', null, queryParams);
};

export const fetchCompanyWorkorders = async () => {
	return await makeApiRequest('GET', '/company/workorders/');
};

export const fetchServiceHistory = async (queryParams = {}) => {
	return await makeApiRequest('GET', '/history/work-orders/', null, queryParams);
};

export const fetchServiceHistoryDetail = async (id) => {
	return await makeApiRequest('GET', `/history/work-orders/${id}/`);
};

export const fetchComponentHistorySearch = async (queryParams = {}) => {
	return await makeApiRequest('GET', '/history/components/', null, queryParams);
};

export const createTrackedComponent = async (payload) => {
	return await makeApiRequest('POST', '/history/components/', payload);
};

export const fetchComponentHistoryDetail = async (id) => {
	return await makeApiRequest('GET', `/history/components/${id}/`);
};

export const downloadComponentHistoryExport = async (id) => {
	const tokens = getTokens();
	const adminCompanyId = localStorage.getItem('adminCompanyId');
	const headers = { Accept: 'text/csv' };
	if (tokens.accessToken) {
		headers.Authorization = `Bearer ${tokens.accessToken}`;
	}
	if (adminCompanyId) {
		headers['X-Company-Id'] = adminCompanyId;
	}
	const base = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
	const response = await axios.get(`${base}/history/components/${id}/export/`, {
		headers,
		responseType: 'blob',
		withCredentials: true,
	});
	const blob = new Blob([response.data], { type: 'text/csv' });
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	const disposition = response.headers['content-disposition'] || '';
	const match = disposition.match(/filename="?([^"]+)"?/);
	const filename = match ? match[1] : `component-${id}.csv`;
	link.href = url;
	link.setAttribute('download', filename);
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.URL.revokeObjectURL(url);
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

// Fleet module APIs
export const fetchFleetAircraft = async (queryParams = {}) => {
	const data = await makeApiRequest('GET', '/fleet/aircraft/', null, queryParams);
	if (Array.isArray(data)) return data;
	if (data && Array.isArray(data.results)) return data.results;
	return [];
};

export const fetchFleetAircraftDetail = async (id) => {
	return await makeApiRequest('GET', `/fleet/aircraft/${id}/`);
};

export const fetchAircraftIntervals = async (aircraftId) => {
	const data = await makeApiRequest('GET', `/fleet/aircraft/${aircraftId}/intervals/`);
	if (Array.isArray(data)) return data;
	if (data && Array.isArray(data.results)) return data.results;
	return [];
};

export const createAircraftInterval = async (aircraftId, payload) => {
	return await makeApiRequest('POST', `/fleet/aircraft/${aircraftId}/intervals/`, payload);
};

export const updateAircraftInterval = async (id, payload) => {
	return await makeApiRequest('PATCH', `/fleet/intervals/${id}/`, payload);
};

export const deleteAircraftInterval = async (id) => {
	return await makeApiRequest('DELETE', `/fleet/intervals/${id}/`);
};

export const completeAircraftInterval = async (id, payload) => {
	return await makeApiRequest('POST', `/fleet/intervals/${id}/complete/`, payload);
};

export const createCompanyFlightRequest = async (payload) => {
	return await makeApiRequest('POST', '/company/flights/request/', payload);
};

export const patchCompanyFlightDispatch = async (id, payload) => {
	return await makeApiRequest('PATCH', `/company/flights/${id}/dispatch/`, payload);
};

export const fetchManagementDashboard = async () => {
	return await makeApiRequest('GET', '/management/dashboard/');
};

/** Phase 2 — Fleet availability donut, open WO by priority, trends (manager/owner). */
export const fetchFleetAvailabilityDashboard = async () => {
	return await makeApiRequest('GET', '/dashboard/fleet-availability/');
};

// Site admin (global scope — no X-Company-Id tenant filter)
const siteAdminScope = { skipCompanyScope: true };

export const fetchCompanies = async () => {
	return await makeApiRequest('GET', '/companies/');
};

export const fetchProfilesForSiteAdmin = async () => {
	return await makeApiRequest('GET', '/profiles/', null, {}, siteAdminScope);
};

export const fetchAircraftForSiteAdmin = async () => {
	return await makeApiRequest('GET', '/aircraft/', null, {}, siteAdminScope);
};

export const fetchFlightsForSiteAdmin = async () => {
	return await makeApiRequest('GET', '/flights/', null, {}, siteAdminScope);
};

export const fetchPartsForSiteAdmin = async () => {
	return await makeApiRequest('GET', '/parts/', null, {}, siteAdminScope);
};

export const fetchInventoriesForSiteAdmin = async () => {
	return await makeApiRequest('GET', '/inventories/', null, {}, siteAdminScope);
};

export const fetchWorkordersForSiteAdmin = async () => {
	return await makeApiRequest('GET', '/workorders/', null, {}, siteAdminScope);
};

export const fetchDiscrepanciesForSiteAdmin = async () => {
	return await makeApiRequest('GET', '/discrepancies/', null, {}, siteAdminScope);
};

const siteAdminMutate = (method, url, body = null) =>
	makeApiRequest(method, url, body, {}, siteAdminScope);

export const createProfileForSiteAdmin = async (payload) =>
	siteAdminMutate('POST', '/profiles/', payload);

export const updateProfileForSiteAdmin = async (id, payload) =>
	siteAdminMutate('PATCH', `/profiles/${id}/`, payload);

export const deleteProfileForSiteAdmin = async (id) =>
	siteAdminMutate('DELETE', `/profiles/${id}/`);

export const createAircraftForSiteAdmin = async (payload) =>
	siteAdminMutate('POST', '/aircraft/', payload);

export const updateAircraftForSiteAdmin = async (id, payload) =>
	siteAdminMutate('PATCH', `/aircraft/${id}/`, payload);

export const deleteAircraftForSiteAdmin = async (id) =>
	siteAdminMutate('DELETE', `/aircraft/${id}/`);

export const createFlightForSiteAdmin = async (payload) =>
	siteAdminMutate('POST', '/flights/', payload);

export const updateFlightForSiteAdmin = async (id, payload) =>
	siteAdminMutate('PATCH', `/flights/${id}/`, payload);

export const deleteFlightForSiteAdmin = async (id) =>
	siteAdminMutate('DELETE', `/flights/${id}/`);

export const createPartForSiteAdmin = async (payload) =>
	siteAdminMutate('POST', '/parts/', payload);

export const updatePartForSiteAdmin = async (id, payload) =>
	siteAdminMutate('PATCH', `/parts/${id}/`, payload);

export const deletePartForSiteAdmin = async (id) =>
	siteAdminMutate('DELETE', `/parts/${id}/`);

export const createInventoryForSiteAdmin = async (payload) =>
	siteAdminMutate('POST', '/inventories/', payload);

export const updateInventoryForSiteAdmin = async (id, payload) =>
	siteAdminMutate('PATCH', `/inventories/${id}/`, payload);

export const deleteInventoryForSiteAdmin = async (id) =>
	siteAdminMutate('DELETE', `/inventories/${id}/`);

export const createWorkorderForSiteAdmin = async (payload) =>
	siteAdminMutate('POST', '/workorders/', payload);

export const updateWorkorderForSiteAdmin = async (id, payload) =>
	siteAdminMutate('PATCH', `/workorders/${id}/`, payload);

export const deleteWorkorderForSiteAdmin = async (id) =>
	siteAdminMutate('DELETE', `/workorders/${id}/`);

export const createDiscrepancyForSiteAdmin = async (payload) =>
	siteAdminMutate('POST', '/discrepancies/', payload);

export const updateDiscrepancyForSiteAdmin = async (id, payload) =>
	siteAdminMutate('PATCH', `/discrepancies/${id}/`, payload);

export const deleteDiscrepancyForSiteAdmin = async (id) =>
	siteAdminMutate('DELETE', `/discrepancies/${id}/`);

export const fetchCompanyById = async (id) => {
	return await makeApiRequest('GET', `/companies/${id}/`);
};

export const createCompany = async (payload) => {
	return await makeApiRequest('POST', '/companies/', payload);
};

export const fetchProfiles = async () => {
	return await makeApiRequest('GET', '/profiles/');
};

export const fetchAircraft = async () => {
	return await makeApiRequest('GET', '/aircraft/');
};

export const createProfile = async (payload) => {
	return await makeApiRequest('POST', '/profiles/', payload);
};

export const updateProfile = async (id, payload) => {
	return await makeApiRequest('PATCH', `/profiles/${id}/`, payload);
};

export const deleteProfile = async (id) => {
	return await makeApiRequest('DELETE', `/profiles/${id}/`);
};

export const createAircraft = async (payload) => {
	return await makeApiRequest('POST', '/aircraft/', payload);
};

export const updateAircraft = async (id, payload) => {
	return await makeApiRequest('PATCH', `/aircraft/${id}/`, payload);
};

export const deleteAircraft = async (id) => {
	return await makeApiRequest('DELETE', `/aircraft/${id}/`);
};

export const fetchFlights = async () => {
	return await makeApiRequest('GET', '/flights/');
};

export const fetchParts = async () => {
	return await makeApiRequest('GET', '/parts/');
};

export const createPart = async (payload) => {
	return await makeApiRequest('POST', '/parts/', payload);
};

export const updatePart = async (id, payload) => {
	return await makeApiRequest('PATCH', `/parts/${id}/`, payload);
};

export const deletePart = async (id) => {
	return await makeApiRequest('DELETE', `/parts/${id}/`);
};

export const fetchInventories = async () => {
	return await makeApiRequest('GET', '/inventories/');
};

export const createInventory = async (payload) => {
	return await makeApiRequest('POST', '/inventories/', payload);
};

export const fetchWorkorders = async () => {
	return await makeApiRequest('GET', '/workorders/');
};

export const createWorkorder = async (payload) => {
	return await makeApiRequest('POST', '/workorders/', payload);
};

export const updateWorkorder = async (id, payload) => {
	return await makeApiRequest('PATCH', `/workorders/${id}/`, payload);
};

export const deleteWorkorder = async (id) => {
	return await makeApiRequest('DELETE', `/workorders/${id}/`);
};

export const fetchDiscrepancies = async () => {
	return await makeApiRequest('GET', '/discrepancies/');
};

export const updateDiscrepancy = async (id, payload) => {
	return await makeApiRequest('PATCH', `/discrepancies/${id}/`, payload);
};

export const deleteDiscrepancy = async (id) => {
	return await makeApiRequest('DELETE', `/discrepancies/${id}/`);
};

export const createFlight = async (payload) => {
	return await makeApiRequest('POST', '/flights/', payload);
};

export const updateFlight = async (id, payload) => {
	return await makeApiRequest('PATCH', `/flights/${id}/`, payload);
};

export const deleteFlight = async (id) => {
	return await makeApiRequest('DELETE', `/flights/${id}/`);
};

export const createDiscrepancy = async (payload) => {
	return await makeApiRequest('POST', '/discrepancies/', payload);
};

export const adminResetPassword = async (profileId, newPassword) => {
	return await makeApiRequest('POST', `/profiles/${profileId}/reset-password/`, {
		new_password: newPassword,
	});
};

export const changeOwnPassword = async (newPassword, confirmPassword) => {
	return await makeApiRequest('POST', '/users/me/change-password/', {
		new_password: newPassword,
		confirm_password: confirmPassword,
	});
};

export const closeWorkOrder = async (id, { completionNotes = '', laborHours = null, laborNotes = '' } = {}) => {
	const body = { completion_notes: completionNotes || '' };
	if (laborHours != null && laborHours !== '') {
		body.labor_hours = laborHours;
	}
	if (laborNotes) {
		body.labor_notes = laborNotes;
	}
	return await makeApiRequest('POST', `/workorders/${id}/close/`, body);
};

export const fetchLaborEntries = async (workOrderId) => {
	return await makeApiRequest('GET', `/workorders/${workOrderId}/labor-entries/`);
};

export const createLaborEntry = async (workOrderId, payload) => {
	return await makeApiRequest('POST', `/workorders/${workOrderId}/labor-entries/`, payload);
};

export const updateLaborEntry = async (workOrderId, entryId, payload) => {
	return await makeApiRequest(
		'PATCH',
		`/workorders/${workOrderId}/labor-entries/${entryId}/`,
		payload
	);
};

export const deleteLaborEntry = async (workOrderId, entryId) => {
	return await makeApiRequest(
		'DELETE',
		`/workorders/${workOrderId}/labor-entries/${entryId}/`
	);
};

export const openWorkOrderFromDiscrepancy = async (discrepancyId) => {
	return await makeApiRequest(
		'POST',
		`/discrepancies/${discrepancyId}/open_work_order/`
	);
};

export const fetchMaintenanceDashboard = async () => {
	return await makeApiRequest('GET', '/maintenance/dashboard/');
};

// Tool & equipment calibration
export const fetchTools = async () => {
	return await makeApiRequest('GET', '/tools/');
};

export const fetchTool = async (id) => {
	return await makeApiRequest('GET', `/tools/${id}/`);
};

export const createTool = async (payload) => {
	return await makeApiRequest('POST', '/tools/', payload);
};

export const updateTool = async (id, payload) => {
	return await makeApiRequest('PATCH', `/tools/${id}/`, payload);
};

export const deleteTool = async (id) => {
	return await makeApiRequest('DELETE', `/tools/${id}/`);
};

export const fetchToolCalibrationHistory = async (id) => {
	return await makeApiRequest('GET', `/tools/${id}/calibration_history/`);
};

export const recordToolCalibration = async (id, payload) => {
	return await makeApiRequest('POST', `/tools/${id}/record_calibration/`, payload);
};
