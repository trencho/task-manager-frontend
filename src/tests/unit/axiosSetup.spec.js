import {vi} from 'vitest';

// axiosSetup.js registers its interceptors against the instance returned by
// axios.create() at import time. Mocking axios lets us capture those handlers and
// drive them directly, which is the only way to exercise the 401 refresh path
// without a server. vi.mock is hoisted above the imports below, exactly as jest.mock was.
vi.mock('axios', () => {
    // The instance is callable: the response interceptor retries by invoking it.
    const instance = vi.fn();
    instance.interceptors = {
        request: {use: vi.fn()},
        response: {use: vi.fn()}
    };
    return {
        __esModule: true,
        default: {
            create: vi.fn(() => instance),
            post: vi.fn()
        }
    };
});

import axios from 'axios';
import axiosInstance from '@/utils/axiosSetup';
import {getAccessToken, setAccessToken, setRefreshToken} from '@/utils/auth';

const onRequest = () => axiosInstance.interceptors.request.use.mock.calls[0][0];
const onRequestError = () => axiosInstance.interceptors.request.use.mock.calls[0][1];
const onResponseError = () => axiosInstance.interceptors.response.use.mock.calls[0][1];
const onResponse = () => axiosInstance.interceptors.response.use.mock.calls[0][0];

describe('utils/axiosSetup', () => {
    beforeEach(() => {
        localStorage.clear();
        axios.post.mockReset();
        axiosInstance.mockReset();
    });

    describe('request interceptor', () => {
        it('Attaches the access token as a Bearer header', () => {
            setAccessToken('access-1');
            const config = onRequest()({headers: {}});

            expect(config.headers.Authorization).toBe('Bearer access-1');
        });

        it('Leaves the headers alone when there is no token', () => {
            const config = onRequest()({headers: {}});

            expect(config.headers.Authorization).toBeUndefined();
        });

        it('Propagates a request error', async () => {
            const boom = new Error('boom');
            await expect(onRequestError()(boom)).rejects.toBe(boom);
        });
    });

    describe('response interceptor', () => {
        it('Passes a successful response straight through', () => {
            const response = {status: 200};
            expect(onResponse()(response)).toBe(response);
        });

        it('Refreshes the access token on a 401 and retries the request', async () => {
            setRefreshToken('refresh-1');
            axios.post.mockResolvedValue({data: 'new-access-token'});
            axiosInstance.mockResolvedValue({status: 200, data: 'retried'});

            const originalRequest = {url: '/api/tasks', headers: {}};
            const result = await onResponseError()({response: {status: 401}, config: originalRequest});

            expect(axios.post).toHaveBeenCalledWith('/api/auth/refresh-token', {refreshToken: 'refresh-1'});
            expect(getAccessToken()).toBe('new-access-token');
            expect(axiosInstance).toHaveBeenCalledWith(originalRequest);
            expect(originalRequest._retry).toBe(true);
            expect(result).toEqual({status: 200, data: 'retried'});
        });

        it('Does not refresh twice for the same request', async () => {
            const alreadyRetried = {url: '/api/tasks', _retry: true};

            await expect(onResponseError()({response: {status: 401}, config: alreadyRetried}))
                .rejects.toEqual({response: {status: 401}, config: alreadyRetried});
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('Clears both tokens when the refresh call itself fails', async () => {
            setAccessToken('access-1');
            setRefreshToken('refresh-1');
            axios.post.mockRejectedValue(new Error('refresh failed'));
            axiosInstance.mockResolvedValue({status: 200});
            vi.spyOn(console, 'error').mockImplementation(() => {
            });

            await onResponseError()({response: {status: 401}, config: {headers: {}}});

            expect(localStorage.getItem('access_token')).toBeNull();
            expect(localStorage.getItem('refresh_token')).toBeNull();
        });

        it('Rejects a non-401 error without refreshing', async () => {
            const error = {response: {status: 500}, config: {}};

            await expect(onResponseError()(error)).rejects.toBe(error);
            expect(axios.post).not.toHaveBeenCalled();
        });

        // A network failure, a DNS error or a CORS rejection produces an error with no
        // `response` at all. Reading error.response.status threw a TypeError, which
        // replaced the real failure with a misleading one.
        it('Rejects a network error, which carries no response', async () => {
            const networkError = Object.assign(new Error('Network Error'), {config: {}});

            await expect(onResponseError()(networkError)).rejects.toBe(networkError);
            expect(axios.post).not.toHaveBeenCalled();
        });

        // axios rejects a cancelled request with no config either.
        it('Rejects an error with neither response nor config', async () => {
            const bare = new Error('cancelled');

            await expect(onResponseError()(bare)).rejects.toBe(bare);
        });
    });
});
