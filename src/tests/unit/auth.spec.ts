import {
    clearTokens,
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken
} from '@/utils/auth';

describe('utils/auth', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('Round-trips the access token', () => {
        expect(getAccessToken()).toBeNull();
        setAccessToken('access-1');
        expect(getAccessToken()).toBe('access-1');
        expect(localStorage.getItem('access_token')).toBe('access-1');
    });

    it('Round-trips the refresh token', () => {
        expect(getRefreshToken()).toBeNull();
        setRefreshToken('refresh-1');
        expect(getRefreshToken()).toBe('refresh-1');
        expect(localStorage.getItem('refresh_token')).toBe('refresh-1');
    });

    it('Keeps the two tokens in separate keys', () => {
        setAccessToken('access-1');
        setRefreshToken('refresh-1');

        expect(getAccessToken()).toBe('access-1');
        expect(getRefreshToken()).toBe('refresh-1');
    });

    it('clearTokens removes both and leaves unrelated keys alone', () => {
        setAccessToken('access-1');
        setRefreshToken('refresh-1');
        localStorage.setItem('theme', 'dark');

        clearTokens();

        expect(getAccessToken()).toBeNull();
        expect(getRefreshToken()).toBeNull();
        expect(localStorage.getItem('theme')).toBe('dark');
    });
});
