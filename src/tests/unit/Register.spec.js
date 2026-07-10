import { flushPromises, shallowMount } from '@vue/test-utils';
import RegisterForm from '@/components/RegisterForm.vue';
import axiosInstance from '@/utils/axiosSetup';

// RegisterForm posts through the configured axios instance, not the bare axios
// module. Mocking 'axios' instead would leave axios.create() returning undefined
// and axiosSetup.js would throw while wiring up its interceptors at import time.
jest.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: { post: jest.fn() }
}));

describe('RegisterForm.vue', () => {
    let push;

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        push = jest.fn();
    });

    const mountForm = () => shallowMount(RegisterForm, {
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
    });

    it('Does not navigate when registration is rejected', async () => {
        jest.spyOn(window, 'alert').mockImplementation(() => {});
        axiosInstance.post.mockRejectedValue({ response: { data: 'Username already taken' } });

        const wrapper = mountForm();
        await wrapper.setData({
            username: 'testuser',
            email: 'testuser@mail.com',
            password: 'password123'
        });
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(push).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith('Registration failed: Username already taken');
    });
});
