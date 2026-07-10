<template>
  <div>
    <button
      class="logout-button"
      :disabled="pending"
      @click="logout"
    >
      Logout
    </button>
  </div>
</template>

<script>
import axiosInstance from '@/utils/axiosSetup';
import { clearTokens, getRefreshToken } from '@/utils/auth';

export default {
  data() {
    return {
      pending: false
    };
  },
  methods: {
    async logout() {
      this.pending = true;
      const refreshToken = getRefreshToken();

      try {
        // Revoke the refresh token server-side. Clearing localStorage alone left it valid
        // until it expired, so a stolen token kept minting access tokens after "logout".
        if (refreshToken) {
          await axiosInstance.post('/api/auth/logout', { refreshToken });
        }
      } catch {
        // The local session is torn down regardless. A user who cannot reach the server
        // must still be able to sign out of this browser; the token expires on its own.
      } finally {
        clearTokens();
        this.pending = false;
        this.$router.push({ name: 'Login' });
      }
    }
  }
}
</script>
