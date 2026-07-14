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
import { setAccessToken, setRefreshToken } from '@/utils/auth';

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

    it('Revokes the refresh token server-side, then clears the local session', async () => {
        setAccessToken('access-1');
        setRefreshToken('refresh-1');
        post.mockResolvedValue({ status: 204 });

        await clickLogout(mountButton());

        expect(post).toHaveBeenCalledWith('/api/auth/logout', { refreshToken: 'refresh-1' });
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('refresh_token')).toBeNull();
        expect(push).toHaveBeenCalledWith({ name: 'Login' });
    });

    // A user who cannot reach the server must still be able to sign out of this browser.
    it('Still clears the session and navigates when the server call fails', async () => {
        setAccessToken('access-1');
        setRefreshToken('refresh-1');
        post.mockRejectedValue(new Error('Network Error'));

        await clickLogout(mountButton());

        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('refresh_token')).toBeNull();
        expect(push).toHaveBeenCalledWith({ name: 'Login' });
    });

    it('Does not call the server when there is no refresh token to revoke', async () => {
        await clickLogout(mountButton());

        expect(post).not.toHaveBeenCalled();
        expect(push).toHaveBeenCalledWith({ name: 'Login' });
    });
});
