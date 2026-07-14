<template>
  <!--
    role="alert" makes a screen reader announce the message when it appears. window.alert(), which
    this replaces, was neither dismissible, styleable, nor assertable from a test.
  -->
  <div
    v-if="message"
    class="error-banner"
    role="alert"
  >
    <span class="error-banner__text">{{ message }}</span>
    <button
      type="button"
      class="error-banner__dismiss"
      aria-label="Dismiss error"
      @click="emit('dismiss')"
    >
      &times;
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ message?: string }>(), { message: '' });
const emit = defineEmits<{ dismiss: [] }>();
</script>

<style scoped>
.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border: 1px solid #f5c2c7;
  border-radius: 4px;
  background: #f8d7da;
  color: #842029;
}

.error-banner__text {
  flex: 1;
}

.error-banner__dismiss {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0;
}
</style>
