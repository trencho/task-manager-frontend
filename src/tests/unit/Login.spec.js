import {vi} from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

// The form posts through the shared instance, not bare axios: only that instance carries the
// configured baseURL.
vi.mock('@/utils/axiosSetup', () => ({
    default: { post: vi.fn() }
}));

import LoginForm from '@/components/LoginForm.vue';
import axiosInstance from '@/utils/axiosSetup';

describe('LoginForm.vue', () => {
    let push;

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        push = vi.fn();
    });

    // mount, not shallowMount: shallowMount stubs ErrorBanner and the message never renders,
    // so the assertions below would pass against a banner that displays nothing.
    const mountForm = () => mount(LoginForm, {
        global: { mocks: { $router: { push } } }
    });

    it('Logs in a user successfully', async () => {
        axiosInstance.post.mockResolvedValue({
            data: { accessToken: 'mockAccessToken', refreshToken: 'mockRefreshToken' }
        });

        const wrapper = mountForm();
        await wrapper.setData({ username: 'testuser', password: 'password123' });
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(axiosInstance.post).toHaveBeenCalledWith('/api/auth/login', {
            username: 'testuser',
            password: 'password123'
        });
        expect(localStorage.getItem('access_token')).toBe('mockAccessToken');
        expect(localStorage.getItem('refresh_token')).toBe('mockRefreshToken');
        expect(push).toHaveBeenCalledWith('/tasks');
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    // setValue drives the inputs the way a user does, exercising the v-model bindings themselves
    // rather than reaching past them with setData.
    it('Posts the username and password typed into the fields', async () => {
        axiosInstance.post.mockResolvedValue({
            data: { accessToken: 'a', refreshToken: 'r' }
        });

        const wrapper = mountForm();
        const [username, password] = wrapper.findAll('input');
        await username.setValue('typed-user');
        await password.setValue('typed-pass');
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(axiosInstance.post).toHaveBeenCalledWith('/api/auth/login', {
            username: 'typed-user',
            password: 'typed-pass'
        });
    });

    it('Shows the server message and does not store tokens when the credentials are rejected', async () => {
        axiosInstance.post.mockRejectedValue({ response: { data: 'Invalid credentials' } });

        const wrapper = mountForm();
        await wrapper.setData({ username: 'testuser', password: 'wrong' });
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(localStorage.getItem('access_token')).toBeNull();
        expect(push).not.toHaveBeenCalled();
        expect(wrapper.find('[role="alert"]').text()).toContain('Invalid credentials');
    });

    it('Renders a message rather than crashing when the request never reached the server', async () => {
        // No `response` property at all -- the shape axios rejects with on a network failure.
        axiosInstance.post.mockRejectedValue(new Error('Network Error'));

        const wrapper = mountForm();
        await wrapper.setData({ username: 'testuser', password: 'password123' });
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(wrapper.find('[role="alert"]').text()).toContain('Network Error');
        expect(push).not.toHaveBeenCalled();
    });

    it('Dismisses the banner', async () => {
        axiosInstance.post.mockRejectedValue({ response: { data: 'Invalid credentials' } });

        const wrapper = mountForm();
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(wrapper.find('[role="alert"]').exists()).toBe(true);

        await wrapper.find('.error-banner__dismiss').trigger('click');
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    it('Clears a previous error when the form is resubmitted successfully', async () => {
        axiosInstance.post.mockRejectedValueOnce({ response: { data: 'Invalid credentials' } });

        const wrapper = mountForm();
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(wrapper.find('[role="alert"]').exists()).toBe(true);

        axiosInstance.post.mockResolvedValueOnce({
            data: { accessToken: 'a', refreshToken: 'r' }
        });
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });
});
