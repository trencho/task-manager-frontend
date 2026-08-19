import * as auth from '@/utils/auth';
import { clearTokens, getAccessToken, setAccessToken } from '@/utils/auth';

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

    it('Offers no way to store a refresh token', () => {
        // Deliberately absent from the module. The refresh token lives in an httpOnly cookie now,
        // and leaving a setter here would leave a working way to put it back in localStorage --
        // which is the exposure this migration removes.
        const authModule = auth as Record<string, unknown>;
        expect(authModule.setRefreshToken).toBeUndefined();
        expect(authModule.getRefreshToken).toBeUndefined();
    });

    it('clearTokens removes the access token and any refresh token left from before the cookie', () => {
        setAccessToken('access-1');
        // A browser upgrading to this bundle still has the old key. It is cleared so a long-lived
        // credential is not left sitting in storage for nothing.
        localStorage.setItem('refresh_token', 'stale');
        localStorage.setItem('theme', 'dark');

        clearTokens();

        expect(getAccessToken()).toBeNull();
        expect(localStorage.getItem('refresh_token')).toBeNull();
        expect(localStorage.getItem('theme')).toBe('dark');
    });
});
