import {vi} from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import LoginForm from '@/components/LoginForm.vue';
import axios from 'axios';

vi.mock('axios');

describe('LoginForm.vue', () => {
    let push;

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        push = vi.fn();
    });

    const mountForm = () => shallowMount(LoginForm, {
        global: { mocks: { $router: { push } } }
    });

    it('Logs in a user successfully', async () => {
        axios.post.mockResolvedValue({
            data: { accessToken: 'mockAccessToken', refreshToken: 'mockRefreshToken' }
        });

        const wrapper = mountForm();
        await wrapper.setData({ username: 'testuser', password: 'password123' });
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/api/auth/login', {
            username: 'testuser',
            password: 'password123'
        });
        expect(localStorage.getItem('access_token')).toBe('mockAccessToken');
        expect(localStorage.getItem('refresh_token')).toBe('mockRefreshToken');
        expect(push).toHaveBeenCalledWith('/tasks');
    });

    it('Does not store tokens or navigate when the credentials are rejected', async () => {
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        axios.post.mockRejectedValue(new Error('Unauthorized'));

        const wrapper = mountForm();
        await wrapper.setData({ username: 'testuser', password: 'wrong' });
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(localStorage.getItem('access_token')).toBeNull();
        expect(push).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalled();
    });
});
