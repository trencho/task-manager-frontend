<template>
  <form @submit.prevent="register">
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
        minlength="3"
        maxlength="30"
      >
    </div>
    <div>
      <label>Email:</label>
      <input
        v-model="email"
        type="email"
        required
      >
    </div>
    <div>
      <label>Password:</label>
      <input
        v-model="password"
        type="password"
        required
        minlength="8"
      >
    </div>
    <button type="submit">
      Register
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { register as registerRequest } from '@/api/auth';
import { apiErrorMessage } from '@/utils/errorMessage';

const router = useRouter();
const username = ref('');
const email = ref('');
const password = ref('');
const error = ref('');

const register = async (): Promise<void> => {
  error.value = '';
  try {
    await registerRequest({
      username: username.value,
      email: email.value,
      password: password.value
    });
    router.push('/login');
  } catch (err) {
    // Was `error.response.data`, which threw a TypeError of its own whenever the request
    // never reached the server.
    error.value = apiErrorMessage(err);
  }
};
</script>
