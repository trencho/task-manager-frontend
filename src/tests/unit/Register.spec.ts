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

    /**
     * Bounds copied from UserRegistrationDTO. The server stays the authority -- these only save
     * the user a round trip that ends in a 400 they could have been told about before submitting.
     *
     * Asserted across all three fields at once rather than field by field, so the middle one is
     * covered too: the server constrains it by format and not by length, and a maxlength that
     * appeared there would be a bound nothing on the server agrees with.
     */
    it('Enforces the bounds the server enforces, and no others', () => {
        const bounds = mountForm().findAll('input')
            .map((field) => [field.attributes('minlength'), field.attributes('maxlength')]);

        // In render order: the identifier field 3-30, the address field unbounded, the secret
        // field at least 8 with no upper limit.
        expect(bounds).toEqual([['3', '30'], [undefined, undefined], ['8', undefined]]);
    });

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

    it('Clears the error when the banner is dismissed', async () => {
        // The @dismiss handler in RegisterForm.vue is `error = ''`, and nothing exercised it here.
        // Login.spec covers the same wiring in its own consumer; a banner that raised the event
        // while the parent ignored it would look identical to a working one until a user clicked.
        post.mockRejectedValue({ response: { data: 'Username already taken' } });

        const wrapper = mountForm();
        await wrapper.find('form').trigger('submit');
        await flushPromises();
        expect(wrapper.find('[role="alert"]').exists()).toBe(true);

        await wrapper.find('.error-banner__dismiss').trigger('click');

        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
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
