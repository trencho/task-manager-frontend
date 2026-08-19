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
import { clearTokens } from '@/utils/auth';

const router = useRouter();
const pending = ref(false);

const logout = async (): Promise<void> => {
  pending.value = true;

  try {
    // Revoke server-side. Clearing localStorage alone left the refresh token valid until it
    // expired, so a stolen token kept minting access tokens after "logout".
    //
    // No body and no condition any more: the token is an httpOnly cookie the browser attaches
    // itself, so this code cannot read it to decide whether to call. The request also has to be
    // made unconditionally now, because clearing that cookie is something only the server can do.
    await axiosInstance.post('/api/auth/logout', undefined, { withCredentials: true });
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
