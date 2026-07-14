<template>
  <form
    class="task-filters"
    role="search"
    @submit.prevent="apply"
  >
    <div>
      <label for="filter-q">Search:</label>
      <input
        id="filter-q"
        v-model="draft.q"
        type="search"
        placeholder="Title or description"
      >
    </div>
    <div>
      <label for="filter-status">Status:</label>
      <select
        id="filter-status"
        v-model="draft.status"
      >
        <option value="">
          Any
        </option>
        <option
          v-for="option in statuses"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
    <div>
      <label for="filter-priority">Priority:</label>
      <select
        id="filter-priority"
        v-model="draft.priority"
      >
        <option value="">
          Any
        </option>
        <option
          v-for="option in priorities"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
    <div>
      <label for="filter-due-before">Due before:</label>
      <input
        id="filter-due-before"
        v-model="draft.dueBefore"
        type="date"
      >
    </div>
    <div>
      <label for="filter-sort">Sort by:</label>
      <select
        id="filter-sort"
        v-model="draft.sort"
      >
        <option
          v-for="option in sortOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
    <button type="submit">
      Apply
    </button>
    <button
      type="button"
      @click="reset"
    >
      Reset
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { TASK_PRIORITIES } from '@/constants/taskPriority';
import { TASK_STATUSES } from '@/constants/taskStatus';
import { SORT_OPTIONS, emptyFilters } from '@/constants/taskFilters';
import type { Filters } from '@/types';

defineOptions({ name: 'TaskFilters' });

const emit = defineEmits<{ apply: [filters: Filters] }>();

const statuses = TASK_STATUSES;
const priorities = TASK_PRIORITIES;
const sortOptions = SORT_OPTIONS;
// Held locally and emitted on submit, so typing in the search box does not fire a request
// per keystroke.
const draft = ref<Filters>(emptyFilters());

const apply = (): void => {
  emit('apply', { ...draft.value });
};

const reset = (): void => {
  draft.value = emptyFilters();
  apply();
};
</script>

<style scoped>
.task-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
  margin: 1rem 0;
}
</style>
