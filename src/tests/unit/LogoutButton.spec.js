import {vi} from 'vitest';
import {flushPromises, shallowMount} from '@vue/test-utils';

vi.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: {post: vi.fn()}
}));

import axiosInstance from '@/utils/axiosSetup';
import LogoutButton from '@/components/LogoutButton.vue';
import {setAccessToken, setRefreshToken} from '@/utils/auth';

describe('LogoutButton.vue', () => {
    let push;

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        push = vi.fn();
    });

    const mountButton = () => shallowMount(LogoutButton, {
        global: {mocks: {$router: {push}}}
    });

    const clickLogout = async (wrapper) => {
        await wrapper.find('button').trigger('click');
        await flushPromises();
    };

    it('Revokes the refresh token server-side, then clears the local session', async () => {
        setAccessToken('access-1');
        setRefreshToken('refresh-1');
        axiosInstance.post.mockResolvedValue({status: 204});

        await clickLogout(mountButton());

        expect(axiosInstance.post).toHaveBeenCalledWith('/api/auth/logout', {refreshToken: 'refresh-1'});
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('refresh_token')).toBeNull();
        expect(push).toHaveBeenCalledWith({name: 'Login'});
    });

    // A user who cannot reach the server must still be able to sign out of this browser.
    it('Still clears the session and navigates when the server call fails', async () => {
        setAccessToken('access-1');
        setRefreshToken('refresh-1');
        axiosInstance.post.mockRejectedValue(new Error('Network Error'));

        await clickLogout(mountButton());

        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('refresh_token')).toBeNull();
        expect(push).toHaveBeenCalledWith({name: 'Login'});
    });

    it('Does not call the server when there is no refresh token to revoke', async () => {
        await clickLogout(mountButton());

        expect(axiosInstance.post).not.toHaveBeenCalled();
        expect(push).toHaveBeenCalledWith({name: 'Login'});
    });
});
