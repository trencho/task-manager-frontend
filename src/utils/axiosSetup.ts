import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '@/utils/auth';
import type { AuthTokens } from '@/types';

// The request config carries a one-shot `_retry` flag we set after a 401 triggers a refresh.
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Unset means "same origin", so requests stay relative (`/api/...`) and the Vite dev-server
// proxy forwards them. Set VITE_API_URL at build time to point a deployed bundle at the API.
const baseURL = import.meta.env.VITE_API_URL || '';

const axiosInstance = axios.create({ baseURL });

// A separate client for the refresh call. It shares the baseURL but carries no interceptors,
// so a 401 from /refresh-token cannot recurse back into the refresh handler. Using the bare
// `axios` module here instead would ignore baseURL entirely and send the refresh to a
// different origin than every other request.
const refreshClient = axios.create({ baseURL });

axiosInstance.interceptors.request.use((config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// The server rotates the refresh token: the presented one is invalidated and a new one comes
// back with the access token. Both must be stored, or the next refresh presents a dead token.
const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        return false;
    }
    try {
        const { data } = await refreshClient.post<AuthTokens>('/api/auth/refresh-token', { refreshToken });
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return true;
    } catch (error) {
        console.error('Failed to refresh access token:', error);
        clearTokens();
        return false;
    }
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableConfig | undefined;
        // A network failure, DNS error, CORS rejection or cancellation arrives with no
        // `response`, and sometimes no `config`. Reading through them unguarded threw a
        // TypeError that replaced the real failure.
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            // Only replay the request if we actually hold a fresh token. Retrying after a
            // failed refresh just sends the same expired credentials again.
            if (await refreshAccessToken()) {
                return axiosInstance(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
