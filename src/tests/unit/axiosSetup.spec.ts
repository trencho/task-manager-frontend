import { vi, type Mock } from 'vitest';

// axiosSetup registers its interceptors against the instance returned by axios.create() at
// import time. Mocking axios lets us capture those handlers and drive them directly, which is
// the only way to exercise the 401 refresh path without a server. vi.mock is hoisted above the
// imports below.
vi.mock('axios', () => {
    // axiosSetup creates TWO clients: the main instance (callable, because the response
    // interceptor retries by invoking it) and a bare refreshClient with no interceptors.
    const instance = vi.fn() as Mock & {
        interceptors: { request: { use: Mock }; response: { use: Mock } };
    };
    instance.interceptors = {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
    };
    const refreshClient = { post: vi.fn() };

    let call = 0;
    return {
        __esModule: true,
        default: {
            create: vi.fn(() => (call++ === 0 ? instance : refreshClient))
        }
    };
});

import axios from 'axios';
import axiosInstanceDefault from '@/utils/axiosSetup';
import { getAccessToken, setAccessToken } from '@/utils/auth';

// The mock replaces these with vi.fn()s; the real axios types don't know that, so narrow here.
const mockedCreate = axios.create as unknown as Mock;
const instance = axiosInstanceDefault as unknown as Mock & {
    interceptors: { request: { use: Mock }; response: { use: Mock } };
};

interface RequestConfig { headers: Record<string, string>; _retry?: boolean; url?: string }
interface ErrorLike { response?: { status: number }; config?: RequestConfig }
type RequestFulfilled = (config: RequestConfig) => RequestConfig;
type RequestRejected = (error: unknown) => Promise<never>;
type ResponseFulfilled = (response: unknown) => unknown;
type ResponseRejected = (error: unknown) => Promise<unknown>;

// The second axios.create() call is the refresh client.
const refreshClient = () => mockedCreate.mock.results[1].value as { post: Mock };

const onRequest = () => instance.interceptors.request.use.mock.calls[0][0] as RequestFulfilled;
const onRequestError = () => instance.interceptors.request.use.mock.calls[0][1] as RequestRejected;
const onResponse = () => instance.interceptors.response.use.mock.calls[0][0] as ResponseFulfilled;
const onResponseError = () => instance.interceptors.response.use.mock.calls[0][1] as ResponseRejected;

describe('utils/axiosSetup', () => {
    beforeEach(() => {
        localStorage.clear();
        refreshClient().post.mockReset();
        instance.mockReset();
    });

    describe('request interceptor', () => {
        it('Attaches the access token as a Bearer header', () => {
            setAccessToken('access-1');
            const config = onRequest()({ headers: {} });

            expect(config.headers.Authorization).toBe('Bearer access-1');
        });

        it('Leaves the headers alone when there is no token', () => {
            const config = onRequest()({ headers: {} });

            expect(config.headers.Authorization).toBeUndefined();
        });

        it('Propagates a request error', async () => {
            const boom = new Error('boom');
            await expect(onRequestError()(boom)).rejects.toBe(boom);
        });
    });

    describe('response interceptor', () => {
        it('Passes a successful response straight through', () => {
            const response = { status: 200 };
            expect(onResponse()(response)).toBe(response);
        });

        it('Refreshes the access token on a 401 and retries the request', async () => {
            refreshClient().post.mockResolvedValue({ data: { accessToken: 'new-access-token' } });
            instance.mockResolvedValue({ status: 200, data: 'retried' });

            const originalRequest: RequestConfig = { url: '/api/tasks', headers: {} };
            const result = await onResponseError()({ response: { status: 401 }, config: originalRequest });

            // No second argument: the refresh token is an httpOnly cookie the browser attaches
            // itself. A body would mean this code had been able to read it.
            expect(refreshClient().post).toHaveBeenCalledWith('/api/auth/refresh-token');
            expect(getAccessToken()).toBe('new-access-token');
            expect(instance).toHaveBeenCalledWith(originalRequest);
            expect(originalRequest._retry).toBe(true);
            expect(result).toEqual({ status: 200, data: 'retried' });
        });

        /**
         * Was "stores the rotated refresh token". It must now do the opposite.
         *
         * The server no longer returns a refresh token in the body at all, so this fixture is a
         * deliberately rogue response rather than a realistic one. It is kept precisely because of
         * that: it pins that a field reappearing -- from a rolled-back server, or a future endpoint
         * -- would still not be written to localStorage, which is the exposure being removed. The
         * real replacement arrives as a Set-Cookie header the browser handles on its own.
         */
        it('Does not store a refresh token even if one appears in the body', async () => {
            refreshClient().post.mockResolvedValue({
                data: { accessToken: 'new-access-token', refreshToken: 'rotated-refresh-token' }
            });
            instance.mockResolvedValue({ status: 200 });

            await onResponseError()({ response: { status: 401 }, config: { headers: {} } });

            expect(localStorage.getItem('refresh_token')).toBeNull();
            expect(getAccessToken()).toBe('new-access-token');
        });

        it('Does not refresh twice for the same request', async () => {
            const alreadyRetried: RequestConfig = { url: '/api/tasks', headers: {}, _retry: true };
            const error: ErrorLike = { response: { status: 401 }, config: alreadyRetried };

            await expect(onResponseError()(error)).rejects.toEqual(error);
            expect(refreshClient().post).not.toHaveBeenCalled();
        });

        /**
         * Was "does not attempt a refresh when no refresh token is stored". That early return is
         * gone on purpose: this code can no longer see whether a session exists, because the token
         * is a cookie it cannot read. It always asks, and the server answers 401 when there is
         * nothing to refresh -- which must still not retry the original request.
         */
        it('Gives up without retrying when the server rejects the refresh', async () => {
            refreshClient().post.mockRejectedValue(new Error('no session'));
            vi.spyOn(console, 'error').mockImplementation(() => {
            });
            const error: ErrorLike = { response: { status: 401 }, config: { headers: {} } };

            await expect(onResponseError()(error)).rejects.toBe(error);
            expect(instance).not.toHaveBeenCalled();
        });

        // Retrying after a failed refresh just resends the same expired credentials.
        it('Clears the session and does not retry when the refresh call itself fails', async () => {
            setAccessToken('access-1');
            refreshClient().post.mockRejectedValue(new Error('refresh failed'));
            vi.spyOn(console, 'error').mockImplementation(() => {
            });

            const error: ErrorLike = { response: { status: 401 }, config: { headers: {} } };
            await expect(onResponseError()(error)).rejects.toBe(error);

            expect(localStorage.getItem('access_token')).toBeNull();
            expect(localStorage.getItem('refresh_token')).toBeNull();
            expect(instance).not.toHaveBeenCalled();
        });

        it('Rejects a non-401 error without refreshing', async () => {
            const error: ErrorLike = { response: { status: 500 }, config: { headers: {} } };

            await expect(onResponseError()(error)).rejects.toBe(error);
            expect(refreshClient().post).not.toHaveBeenCalled();
        });

        // A network failure, a DNS error or a CORS rejection produces an error with no
        // `response` at all. Reading error.response.status threw a TypeError, which
        // replaced the real failure with a misleading one.
        it('Rejects a network error, which carries no response', async () => {
            const networkError = Object.assign(new Error('Network Error'), { config: { headers: {} } });

            await expect(onResponseError()(networkError)).rejects.toBe(networkError);
            expect(refreshClient().post).not.toHaveBeenCalled();
        });

        // axios rejects a cancelled request with no config either.
        it('Rejects an error with neither response nor config', async () => {
            const bare = new Error('cancelled');

            await expect(onResponseError()(bare)).rejects.toBe(bare);
        });
    });
});
