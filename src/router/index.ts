import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { getAccessToken } from '@/utils/auth';
import RegisterView from '@/views/RegisterView.vue';
import LoginView from '@/views/LoginView.vue';
import TaskManagerView from '@/views/TaskManagerView.vue';

// Augment route meta so `meta.requiresAuth` / `meta.requiresGuest` are typed in the guard below.
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresGuest?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Default', redirect: '/login' },
  { path: '/signup', name: 'Register', component: RegisterView, meta: { requiresGuest: true } },
  { path: '/login', name: 'Login', component: LoginView, meta: { requiresGuest: true } },
  { path: '/tasks', name: 'Tasks', component: TaskManagerView, meta: { requiresAuth: true } }
];

const router = createRouter({
  // `mode` was a Vue Router 3 option. Router 4 and 5 take `history`, and ignored it silently.
  history: createWebHistory(),
  routes
});

// Returning the destination rather than calling next(): the next() callback is deprecated in
// vue-router 5 and warns on every guarded navigation.
router.beforeEach((to) => {
  const isAuthenticated = Boolean(getAccessToken());

  if (to.matched.some((record) => record.meta.requiresAuth) && !isAuthenticated) {
    return { name: 'Login' };
  }
  if (to.matched.some((record) => record.meta.requiresGuest) && isAuthenticated) {
    return { name: 'Tasks' };
  }
  return true;
});

export default router;
