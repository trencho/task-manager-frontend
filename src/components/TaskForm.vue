<template>
  <form @submit.prevent="submitTask">
    <div>
      <label>Title:</label>
      <input
        v-model="task.title"
        required
      >
    </div>
    <div>
      <label>Description:</label>
      <textarea v-model="task.description" />
    </div>
    <div>
      <label>Due Date:</label>
      <input
        v-model="task.dueDate"
        type="date"
      >
    </div>
    <div>
      <label for="task-status">Status:</label>
      <select
        id="task-status"
        v-model="task.status"
      >
        <option
          v-for="option in statuses"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
    <button type="submit">
      {{ isEditing ? 'Update' : 'Create' }} Task
    </button>
  </form>
</template>

<script>
import { TASK_STATUSES } from '@/constants/taskStatus';

export default {
  props: {
    task: {
      type: Object,
      required: true
    },
    isEditing: {
      type: Boolean,
      default: false
    }
  },
  emits: ['submit-task'],
  data() {
    return {
      statuses: TASK_STATUSES
    };
  },
  methods: {
    submitTask() {
      this.$emit('submit-task', this.task);
    }
  }
};
</script>