import { vi, type Mock } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const push = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

// RegisterForm posts through the configured axios instance, not the bare axios module.
vi.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: { post: vi.fn() }
}));

import RegisterForm from '@/components/RegisterForm.vue';
import axiosInstance from '@/utils/axiosSetup';

const post = axiosInstance.post as unknown as Mock;

describe('RegisterForm.vue', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    // mount, not shallowMount: shallowMount stubs ErrorBanner, so a banner rendering nothing
    // would still satisfy these assertions.
    const mountForm = () => mount(RegisterForm);

    it('Registers a user successfully', async () => {
        post.mockResolvedValue({ data: 'User registered successfully!' });

        const wrapper = mountForm();
        const [username, email, password] = wrapper.findAll('input');
        await username.setValue('testuser');
        await email.setValue('testuser@mail.com');
        await password.setValue('password123');
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(post).toHaveBeenCalledWith('/api/auth/signup', {
            username: 'testuser',
            email: 'testuser@mail.com',
            password: 'password123'
        });
        expect(push).toHaveBeenCalledWith('/login');
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    it('Posts the values typed into the fields', async () => {
        post.mockResolvedValue({ data: 'User registered successfully!' });

        const wrapper = mountForm();
        const [username, email, password] = wrapper.findAll('input');
        await username.setValue('typed-user');
        await email.setValue('typed@mail.com');
        await password.setValue('typed-pass');
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(post).toHaveBeenCalledWith('/api/auth/signup', {
            username: 'typed-user',
            email: 'typed@mail.com',
            password: 'typed-pass'
        });
        expect(push).toHaveBeenCalledWith('/login');
    });

    it('Shows the server message and does not navigate when registration is rejected', async () => {
        post.mockRejectedValue({ response: { data: 'Username already taken' } });

        const wrapper = mountForm();
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(push).not.toHaveBeenCalled();
        expect(wrapper.find('[role="alert"]').text()).toContain('Username already taken');
    });

    it('Joins the validation failures the backend returns as an array', async () => {
        post.mockRejectedValue({
            response: { data: ['email: Email is required', 'password: too short'] }
        });

        const wrapper = mountForm();
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        const text = wrapper.find('[role="alert"]').text();
        expect(text).toContain('email: Email is required');
        expect(text).toContain('password: too short');
    });

    /**
     * The handler used to read `error.response.data` unguarded. On a network failure there is no
     * `response`, so the catch block threw a TypeError of its own and the user saw nothing.
     */
    it('Renders a message rather than crashing when the request never reached the server', async () => {
        post.mockRejectedValue(new Error('Network Error'));

        const wrapper = mountForm();
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(wrapper.find('[role="alert"]').text()).toContain('Network Error');
        expect(push).not.toHaveBeenCalled();
    });
});
