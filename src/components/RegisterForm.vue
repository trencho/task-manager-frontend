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
      >
    </div>
    <button type="submit">
      Register
    </button>
  </form>
</template>

<script>
import ErrorBanner from '@/components/ErrorBanner.vue';
import axiosInstance from '@/utils/axiosSetup';
import { apiErrorMessage } from '@/utils/errorMessage';

export default {
  components: { ErrorBanner },
  data() {
    return {
      username: '',
      email: '',
      password: '',
      error: ''
    };
  },
  methods: {
    async register() {
      this.error = '';
      try {
        await axiosInstance.post('/api/auth/signup', {
          username: this.username,
          email: this.email,
          password: this.password
        });
        this.$router.push('/login');
      } catch (error) {
        // Was `error.response.data`, which threw a TypeError of its own whenever the request
        // never reached the server.
        this.error = apiErrorMessage(error);
      }
    }
  }
};
</script>