import { vi, type Mock } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';

// The component now calls useRouter() (Composition API) instead of this.$router, so mock the
// composable rather than injecting $router. `push` is module-level so the hoisted factory can
// reference it; vi.clearAllMocks() resets it between tests.
const push = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

vi.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: { post: vi.fn() }
}));

import axiosInstance from '@/utils/axiosSetup';
import LogoutButton from '@/components/LogoutButton.vue';
import { setAccessToken } from '@/utils/auth';

const post = axiosInstance.post as unknown as Mock;

describe('LogoutButton.vue', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    const mountButton = () => shallowMount(LogoutButton);

    const clickLogout = async (wrapper: ReturnType<typeof mountButton>) => {
        await wrapper.find('button').trigger('click');
        await flushPromises();
    };

    it('Revokes server-side with no body, then clears the local session', async () => {
        setAccessToken('access-1');
        post.mockResolvedValue({ status: 204 });

        await clickLogout(mountButton());

        // No body: the refresh token is an httpOnly cookie the browser attaches itself, and
        // withCredentials is what makes it do so. Sending a token would mean this code could read
        // it, which is the exposure being removed.
        expect(post).toHaveBeenCalledWith('/api/auth/logout', undefined, { withCredentials: true });
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(push).toHaveBeenCalledWith({ name: 'Login' });
    });

    // A user who cannot reach the server must still be able to sign out of this browser.
    it('Still clears the session and navigates when the server call fails', async () => {
        setAccessToken('access-1');
        post.mockRejectedValue(new Error('Network Error'));

        await clickLogout(mountButton());

        expect(localStorage.getItem('access_token')).toBeNull();
        expect(push).toHaveBeenCalledWith({ name: 'Login' });
    });

    /**
     * Was "does not call the server when there is no refresh token to revoke". That check is gone
     * on purpose: this code can no longer see whether a session exists, because the token is a
     * cookie it cannot read -- and clearing that cookie is something only the server can do, so the
     * call has to be made either way.
     */
    it('Calls the server even with nothing in local storage, so the cookie gets cleared', async () => {
        post.mockResolvedValue({ status: 204 });

        await clickLogout(mountButton());

        expect(post).toHaveBeenCalledWith('/api/auth/logout', undefined, { withCredentials: true });
        expect(push).toHaveBeenCalledWith({ name: 'Login' });
    });
});
