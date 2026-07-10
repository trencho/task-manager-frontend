import {vi} from 'vitest';
import { shallowMount } from '@vue/test-utils';

vi.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

import LoginView from '@/views/LoginView.vue';
import RegisterView from '@/views/RegisterView.vue';

// Thin wrappers: the only thing worth asserting is that they render their heading and mount the
// form beneath it. shallowMount keeps the forms stubbed -- they have their own specs.
describe('view wrappers', () => {
    it('LoginView renders its heading and the login form', () => {
        const wrapper = shallowMount(LoginView);
        expect(wrapper.find('h2').text()).toBe('Login');
        expect(wrapper.findComponent({ name: 'LoginForm' }).exists()).toBe(true);
    });

    it('RegisterView renders its heading and the register form', () => {
        const wrapper = shallowMount(RegisterView);
        expect(wrapper.find('h2').exists()).toBe(true);
        expect(wrapper.findComponent({ name: 'RegisterForm' }).exists()).toBe(true);
    });
});
