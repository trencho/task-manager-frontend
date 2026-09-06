import axiosInstance from '@/utils/axiosSetup';
import type { AuthTokens } from '@/types';

// The shared instance, not bare axios: only it carries the configured baseURL and
// withCredentials. Every endpoint string for /api/auth lives in this file and nowhere else, so
// a renamed route is one edit rather than a grep.

export interface Credentials {
  username: string;
  password: string;
}

export interface Registration extends Credentials {
  email: string;
}

export const login = (credentials: Credentials) =>
  axiosInstance.post<AuthTokens>('/api/auth/login', credentials);

export const register = (registration: Registration) =>
  axiosInstance.post('/api/auth/signup', registration);

// The refresh token is an httpOnly cookie the browser attaches itself, so there is no body to
// build and nothing to decide: this code cannot read the cookie, and clearing it is something
// only the server can do.
export const logout = () =>
  axiosInstance.post('/api/auth/logout', undefined, { withCredentials: true });
