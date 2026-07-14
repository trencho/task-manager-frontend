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

<script setup lang="ts">
import { priorityLabel } from '@/constants/taskPriority';
import { statusLabel } from '@/constants/taskStatus';
import type { Task } from '@/types';

const props = defineProps<{
  tasks: Task[];
  page: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  'edit-task': [task: Task];
  'delete-task': [id: string];
  'change-page': [page: number];
}>();

const editTask = (task: Task): void => {
  emit('edit-task', task);
};

const deleteTask = (id: string): void => {
  const confirmation = window.confirm('Are you sure you want to delete this task?');
  if (confirmation) {
    emit('delete-task', id);
  }
};

const nextPage = (): void => {
  emit('change-page', props.page + 1);
};

const previousPage = (): void => {
  emit('change-page', props.page - 1);
};
</script>
