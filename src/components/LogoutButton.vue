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

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axiosInstance from '@/utils/axiosSetup';
import { clearTokens, getRefreshToken } from '@/utils/auth';

const router = useRouter();
const pending = ref(false);

const logout = async (): Promise<void> => {
  pending.value = true;
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
    pending.value = false;
    router.push({ name: 'Login' });
  }
};
</script>
