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
    // The refresh token is not stored: the server sets it as an httpOnly cookie on this response.
    // It is still present in the body during the migration, and deliberately ignored - putting it
    // into localStorage is exactly the exposure this change removes.
    router.push('/tasks');
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
};
</script>
