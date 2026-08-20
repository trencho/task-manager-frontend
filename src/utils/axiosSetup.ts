import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken, clearTokens } from '@/utils/auth';
import type { AuthTokens } from '@/types';

// The request config carries a one-shot `_retry` flag we set after a 401 triggers a refresh.
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Unset means "same origin", so requests stay relative (`/api/...`) and the Vite dev-server
// proxy forwards them. Set VITE_API_URL at build time to point a deployed bundle at the API.
const baseURL = import.meta.env.VITE_API_URL || '';

// withCredentials on the SHARED instance, not only on the calls that obviously need a cookie.
//
// Login is the request that ESTABLISHES the refresh cookie, and it goes through this instance.
// Without this, `refreshClient` and the logout call each set withCredentials while login did not,
// and a cross-origin deployment -- VITE_API_URL pointing at another origin, a documented and
// supported mode -- silently discarded the Set-Cookie. Login looked successful, then the first
// 401 refresh had no cookie to send and logged the user straight back out, with no error
// anywhere. Same-origin it is a no-op, which is why nothing caught it.
//
// Setting it here rather than on the one call removes the asymmetry that caused the bug instead
// of patching the one instance of it. Cross-origin ALSO needs the backend to send
// Access-Control-Allow-Credentials with a concrete origin; that half lives in
// task-manager-backend, which configures no CORS at all today.
const axiosInstance = axios.create({ baseURL, withCredentials: true });

// A separate client for the refresh call. It shares the baseURL but carries no interceptors,
// so a 401 from /refresh-token cannot recurse back into the refresh handler. Using the bare
// `axios` module here instead would ignore baseURL entirely and send the refresh to a
// different origin than every other request.
// withCredentials so the browser attaches the httpOnly refresh cookie. The access token still
// travels as an Authorization header on the main instance.
const refreshClient = axios.create({ baseURL, withCredentials: true });

axiosInstance.interceptors.request.use((config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// The refresh token is an httpOnly cookie the browser attaches itself, so there is nothing to look
// up and nothing to send. That is the point: this code cannot read it, so neither can an attacker's.
// The server still rotates on every use and sets the replacement cookie in its response.
//
// It follows that the client can no longer tell in advance whether a session exists -- the old
// early return on a missing token is gone, and the server decides by answering 401.
const refreshAccessToken = async (): Promise<boolean> => {
    try {
        const { data } = await refreshClient.post<AuthTokens>('/api/auth/refresh-token');
        // A 200 with no access token is a broken contract, not a refreshed session.
        if (!data.accessToken) {
            throw new Error('Refresh response did not contain an access token');
        }
        setAccessToken(data.accessToken);
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
