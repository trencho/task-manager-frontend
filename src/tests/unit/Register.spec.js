import {vi} from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import RegisterForm from '@/components/RegisterForm.vue';
import axiosInstance from '@/utils/axiosSetup';

// RegisterForm posts through the configured axios instance, not the bare axios
// module. Mocking 'axios' instead would leave axios.create() returning undefined
// and axiosSetup.js would throw while wiring up its interceptors at import time.
vi.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: { post: vi.fn() }
}));

describe('RegisterForm.vue', () => {
    let push;

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        push = vi.fn();
    });

    // mount, not shallowMount: shallowMount stubs ErrorBanner, so a banner rendering nothing
    // would still satisfy these assertions.
    const mountForm = () => mount(RegisterForm, {
        global: { mocks: { $router: { push } } }
    });

    it('Registers a user successfully', async () => {
        axiosInstance.post.mockResolvedValue({ data: 'User registered successfully!' });

        const wrapper = mountForm();
        await wrapper.setData({
            username: 'testuser',
            email: 'testuser@mail.com',
            password: 'password123'
        });
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(axiosInstance.post).toHaveBeenCalledWith('/api/auth/signup', {
            username: 'testuser',
            email: 'testuser@mail.com',
            password: 'password123'
        });
        expect(push).toHaveBeenCalledWith('/login');
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    // setValue drives the inputs the way a user does, exercising the v-model bindings themselves
    // rather than reaching past them with setData.
    it('Posts the values typed into the fields', async () => {
        axiosInstance.post.mockResolvedValue({ data: 'User registered successfully!' });

        const wrapper = mountForm();
        const [username, email, password] = wrapper.findAll('input');
        await username.setValue('typed-user');
        await email.setValue('typed@mail.com');
        await password.setValue('typed-pass');
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(axiosInstance.post).toHaveBeenCalledWith('/api/auth/signup', {
            username: 'typed-user',
            email: 'typed@mail.com',
            password: 'typed-pass'
        });
        expect(push).toHaveBeenCalledWith('/login');
    });

    it('Shows the server message and does not navigate when registration is rejected', async () => {
        axiosInstance.post.mockRejectedValue({ response: { data: 'Username already taken' } });

        const wrapper = mountForm();
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(push).not.toHaveBeenCalled();
        expect(wrapper.find('[role="alert"]').text()).toContain('Username already taken');
    });

    it('Joins the validation failures the backend returns as an array', async () => {
        axiosInstance.post.mockRejectedValue({
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
        axiosInstance.post.mockRejectedValue(new Error('Network Error'));

        const wrapper = mountForm();
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(wrapper.find('[role="alert"]').text()).toContain('Network Error');
        expect(push).not.toHaveBeenCalled();
    });
});
