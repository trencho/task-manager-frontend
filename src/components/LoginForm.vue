<template>
  <form @submit.prevent="login">
    <ErrorBanner
      :message="error"
      @dismiss="error = ''"
    />
    <div>
      <label>Username:</label>
      <input
        v-model="username"
        type="username"
        required
      >
    </div>
    <div>
      <label>Password:</label>
      <input
        v-model="password"
        type="password"
        required
      >
    </div>
    <button type="submit">
      Login
    </button>
  </form>
</template>

<script setup lang="ts">
// The shared instance, not bare axios: only it carries the configured baseURL, so a bundle built
// with VITE_API_URL was posting to the wrong origin from this form alone.
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { setAccessToken } from '@/utils/auth';
import axiosInstance from '@/utils/axiosSetup';
import { apiErrorMessage } from '@/utils/errorMessage';
import type { AuthTokens } from '@/types';

const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');

const login = async (): Promise<void> => {
  error.value = '';
  try {
    const response = await axiosInstance.post<AuthTokens>('/api/auth/login', {
      username: username.value,
      password: password.value
    });
    setAccessToken(response.data.accessToken);
    // The refresh token is not stored, and cannot be: the server sets it as an httpOnly cookie
    // on THIS response, and stopped sending it in the body when the backend completed step 3 of
    // the migration. That is why `axiosInstance` carries withCredentials -- without it the
    // browser drops the Set-Cookie on a cross-origin deployment and the session dies at the
    // first refresh.
    router.push('/tasks');
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
};
</script>
