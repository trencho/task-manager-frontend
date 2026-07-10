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

<script>
// The shared instance, not bare axios: only it carries the configured baseURL, so a bundle built
// with VITE_API_URL was posting to the wrong origin from this form alone.
import ErrorBanner from '@/components/ErrorBanner.vue';
import { setAccessToken, setRefreshToken } from '@/utils/auth';
import axiosInstance from '@/utils/axiosSetup';
import { apiErrorMessage } from '@/utils/errorMessage';

export default {
  components: { ErrorBanner },
  data() {
    return {
      username: '',
      password: '',
      error: ''
    };
  },
  methods: {
    async login() {
      this.error = '';
      try {
        const response = await axiosInstance.post('/api/auth/login', {
          username: this.username,
          password: this.password
        });
        setAccessToken(response.data.accessToken);
        setRefreshToken(response.data.refreshToken);
        this.$router.push('/tasks');
      } catch (error) {
        this.error = apiErrorMessage(error);
      }
    }
  }
};
</script>