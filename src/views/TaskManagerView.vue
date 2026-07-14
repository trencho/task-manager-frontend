<template>
  <div>
    <h2>Task Manager</h2>
    <ErrorBanner
      :message="error"
      @dismiss="error = ''"
    />
    <TaskForm
      :task="currentTask"
      :is-editing="isEditing"
      @submit-task="handleTaskSubmit"
    />
    <TaskFilters @apply="applyFilters" />
    <TaskList
      :tasks="tasks"
      :page="page"
      :total-pages="totalPages"
      @edit-task="editTask"
      @delete-task="deleteTask"
      @change-page="fetchTasks"
    />
    <LogoutButton />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axiosInstance from '@/utils/axiosSetup';
import ErrorBanner from '@/components/ErrorBanner.vue';
import TaskFilters from '@/components/TaskFilters.vue';
import TaskForm from '@/components/TaskForm.vue';
import TaskList from '@/components/TaskList.vue';
import LogoutButton from '@/components/LogoutButton.vue';
import { emptyFilters } from '@/constants/taskFilters';
import { DEFAULT_TASK_PRIORITY } from '@/constants/taskPriority';
import { DEFAULT_TASK_STATUS } from '@/constants/taskStatus';
import { apiErrorMessage } from '@/utils/errorMessage';
import type { Filters, NewTask, PagedTasks, Task } from '@/types';

const PAGE_SIZE = 10;

const emptyTask = (): NewTask => ({
  title: '',
  description: '',
  dueDate: '',
  status: DEFAULT_TASK_STATUS,
  priority: DEFAULT_TASK_PRIORITY
});

const tasks = ref<Task[]>([]);
const currentTask = ref<NewTask | Task>({ ...emptyTask() });
const isEditing = ref(false);
const page = ref(0);
// Was assigned in fetchTasks but never declared, so it was not reactive and
// TaskList rendered with `totalPages` undefined on first paint.
const totalPages = ref(0);
const error = ref('');
const filters = ref<Filters>(emptyFilters());

/**
 * Empty filters are omitted entirely. Sending `status=` would bind to an empty TaskStatus on
 * the backend and fail conversion, and URLSearchParams encodes the rest, so a search for
 * "a&b" cannot inject a parameter.
 */
const buildQuery = (targetPage: number): string => {
  const params = new URLSearchParams({ page: String(targetPage), size: String(PAGE_SIZE) });
  for (const [key, value] of Object.entries(filters.value)) {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, value);
    }
  }
  return params.toString();
};

const fetchTasks = async (targetPage = 0): Promise<void> => {
  error.value = '';
  try {
    const response = await axiosInstance.get<PagedTasks>(`/api/tasks?${buildQuery(targetPage)}`);
    tasks.value = response.data.content;
    page.value = targetPage;
    totalPages.value = response.data.page.totalPages;

    // Deleting the last task on the last page leaves the user on a page that no longer
    // exists, staring at an empty list. Step back to the last page that does.
    if (totalPages.value > 0 && targetPage >= totalPages.value) {
      await fetchTasks(totalPages.value - 1);
    }
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
};

const applyFilters = (newFilters: Filters): void => {
  filters.value = { ...newFilters };
  // Back to the first page: the page the user is on may not exist under the new filter.
  fetchTasks(0);
};

const resetForm = (): void => {
  currentTask.value = { ...emptyTask() };
  isEditing.value = false;
};

const createTask = async (task: NewTask | Task): Promise<void> => {
  error.value = '';
  try {
    await axiosInstance.post('/api/tasks', task);
    resetForm();
    // Refetch rather than push the new task onto the list. Pushing appended an eleventh row
    // to a ten-row page, and would now also show a task the active filter excludes.
    await fetchTasks(page.value);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
};

const updateTask = async (task: NewTask | Task): Promise<void> => {
  error.value = '';
  try {
    await axiosInstance.put(`/api/tasks/${(task as Task).id}`, task);
    resetForm();
    fetchTasks(page.value);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
};

const handleTaskSubmit = async (task: NewTask | Task): Promise<void> => {
  if (isEditing.value) {
    await updateTask(task);
  } else {
    await createTask(task);
  }
};

const deleteTask = async (id: string): Promise<void> => {
  error.value = '';
  try {
    await axiosInstance.delete(`/api/tasks/${id}`);
    fetchTasks(page.value);
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
};

const editTask = (task: Task): void => {
  currentTask.value = { ...task };
  isEditing.value = true;
};

onMounted(() => {
  fetchTasks();
});
</script>
