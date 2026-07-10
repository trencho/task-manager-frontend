import {vi} from 'vitest';

// The router imports TaskManagerView, which imports the axios instance at module load.
vi.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

import router from '@/router';
import { setAccessToken } from '@/utils/auth';

describe('router', () => {
    beforeEach(async () => {
        localStorage.clear();
        // isReady() resolves on the first navigation, and nothing mounts the router here, so it
        // has to be kicked off by hand or every test hangs until it times out.
        await router.replace('/login');
        await router.isReady();
    });

    // vue-router treats a push to the route it is already on as a duplicate and skips the guards
    // entirely, so every test below starts somewhere other than its destination.
    const startAt = async (path) => {
        await router.replace(path);
        expect(router.currentRoute.value.path).toBe(path);
    };

    it('Redirects the root path to login', async () => {
        await startAt('/signup');
        await router.push('/');
        expect(router.currentRoute.value.name).toBe('Login');
    });

    describe('requiresAuth', () => {
        it('Bounces an anonymous visitor away from /tasks', async () => {
            await startAt('/login');
            await router.push('/tasks');
            expect(router.currentRoute.value.name).toBe('Login');
        });

        it('Lets an authenticated visitor through to /tasks', async () => {
            await startAt('/login');
            setAccessToken('a-token');
            await router.push('/tasks');
            expect(router.currentRoute.value.name).toBe('Tasks');
        });
    });

    describe('requiresGuest', () => {
        it('Bounces an authenticated visitor away from /login', async () => {
            await startAt('/signup');
            setAccessToken('a-token');
            await router.push('/login');
            expect(router.currentRoute.value.name).toBe('Tasks');
        });

        it('Bounces an authenticated visitor away from /signup', async () => {
            await startAt('/login');
            setAccessToken('a-token');
            await router.push('/signup');
            expect(router.currentRoute.value.name).toBe('Tasks');
        });

        it('Lets an anonymous visitor reach /signup', async () => {
            await startAt('/login');
            await router.push('/signup');
            expect(router.currentRoute.value.name).toBe('Register');
        });
    });
});
