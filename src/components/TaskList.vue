<template>
  <div class="task-list">
    <ul>
      <li
        v-for="task in tasks"
        :key="task.id"
        class="task-item task-actions"
      >
        <strong class="task-title">{{ task.title }}</strong>: {{ task.description }} - <em>Due: {{ task.dueDate }}</em>
        <span class="task-status">{{ statusLabel(task.status) }}</span>
        <span class="task-priority">{{ priorityLabel(task.priority) }}</span>
        <button
          class="edit"
          @click="editTask(task)"
        >
          Edit
        </button>
        <button @click="deleteTask(task.id)">
          Delete
        </button>
      </li>
    </ul>

    <div
      v-if="tasks.length > 0"
      class="pagination"
    >
      <button
        :disabled="page === 0"
        @click="previousPage"
      >
        Previous
      </button>
      <span>Page {{ page + 1 }} of {{ totalPages }}</span>
      <button
        :disabled="page >= totalPages - 1"
        @click="nextPage"
      >
        Next
      </button>
    </div>
    <div v-else>
      <p>No tasks available.</p>
    </div>
  </div>
</template>

<script>
import { priorityLabel } from '@/constants/taskPriority';
import { statusLabel } from '@/constants/taskStatus';

export default {
  props: {
    tasks: {
      type: Array,
      required: true
    },
    page: {
      type: Number,
      required: true
    },
    totalPages: {
      type: Number,
      required: true
    }
  },
  emits: ['edit-task', 'delete-task', 'change-page'],
  methods: {
    statusLabel,
    priorityLabel,
    editTask(task) {
      this.$emit('edit-task', task);
    },
    deleteTask(id) {
      const confirmation = window.confirm('Are you sure you want to delete this task?');
      if (confirmation) {
        this.$emit('delete-task', id);
      }
    },
    nextPage() {
      this.$emit('change-page', this.page + 1);
    },
    previousPage() {
      this.$emit('change-page', this.page - 1);
    }
  }
};
</script>