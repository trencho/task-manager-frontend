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
import { logout as logoutRequest } from '@/api/auth';
import { clearTokens } from '@/utils/auth';

const router = useRouter();
const pending = ref(false);

const logout = async (): Promise<void> => {
  pending.value = true;

  try {
    // Revoke server-side, unconditionally. Clearing localStorage alone left the refresh token
    // valid until it expired, so a stolen token kept minting access tokens after "logout" -- and
    // this code cannot read the httpOnly cookie to decide whether a call is even needed.
    await logoutRequest();
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
