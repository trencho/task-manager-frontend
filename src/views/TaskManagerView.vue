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

<script>
import axiosInstance from '@/utils/axiosSetup';
import ErrorBanner from '@/components/ErrorBanner.vue';
import TaskFilters from '@/components/TaskFilters.vue';
import { emptyFilters } from '@/constants/taskFilters';
import TaskForm from '@/components/TaskForm.vue';
import TaskList from '@/components/TaskList.vue';
import LogoutButton from '@/components/LogoutButton.vue';
import { DEFAULT_TASK_PRIORITY } from '@/constants/taskPriority';
import { DEFAULT_TASK_STATUS } from '@/constants/taskStatus';
import { apiErrorMessage } from '@/utils/errorMessage';

const PAGE_SIZE = 10;

const emptyTask = () => ({
  title: '',
  description: '',
  dueDate: '',
  status: DEFAULT_TASK_STATUS,
  priority: DEFAULT_TASK_PRIORITY
});

export default {
  components: {
    ErrorBanner,
    TaskFilters,
    TaskForm,
    TaskList,
    LogoutButton
  },
  data() {
    return {
      tasks: [],
      currentTask: { ...emptyTask() },
      isEditing: false,
      page: 0,
      // Was assigned in fetchTasks but never declared, so it was not reactive and
      // TaskList rendered with `totalPages` undefined on first paint.
      totalPages: 0,
      error: '',
      filters: emptyFilters()
    };
  },
  mounted() {
    this.fetchTasks();
  },
  methods: {
    /**
     * Empty filters are omitted entirely. Sending `status=` would bind to an empty TaskStatus on
     * the backend and fail conversion, and URLSearchParams encodes the rest, so a search for
     * "a&b" cannot inject a parameter.
     */
    buildQuery(page) {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      for (const [key, value] of Object.entries(this.filters)) {
        if (value !== '' && value !== null && value !== undefined) {
          params.set(key, value);
        }
      }
      return params.toString();
    },
    applyFilters(filters) {
      this.filters = { ...filters };
      // Back to the first page: the page the user is on may not exist under the new filter.
      this.fetchTasks(0);
    },
    async fetchTasks(page = 0) {
      this.error = '';
      try {
        const response = await axiosInstance.get(`/api/tasks?${this.buildQuery(page)}`);
        this.tasks = response.data.content;
        this.page = page;
        this.totalPages = response.data.page.totalPages;

        // Deleting the last task on the last page leaves the user on a page that no longer
        // exists, staring at an empty list. Step back to the last page that does.
        if (this.totalPages > 0 && page >= this.totalPages) {
          await this.fetchTasks(this.totalPages - 1);
        }
      } catch (error) {
        this.error = apiErrorMessage(error);
      }
    },
    async handleTaskSubmit(task) {
      if (this.isEditing) {
        await this.updateTask(task);
      } else {
        await this.createTask(task);
      }
    },
    async createTask(task) {
      this.error = '';
      try {
        await axiosInstance.post('/api/tasks', task);
        this.resetForm();
        // Refetch rather than push the new task onto the list. Pushing appended an eleventh row
        // to a ten-row page, and would now also show a task the active filter excludes.
        await this.fetchTasks(this.page);
      } catch (error) {
        this.error = apiErrorMessage(error);
      }
    },
    async updateTask(task) {
      this.error = '';
      try {
        await axiosInstance.put(`/api/tasks/${task.id}`, task);
        this.resetForm();
        this.fetchTasks(this.page);
      } catch (error) {
        this.error = apiErrorMessage(error);
      }
    },
    async deleteTask(id) {
      this.error = '';
      try {
        await axiosInstance.delete(`/api/tasks/${id}`);
        this.fetchTasks(this.page);
      } catch (error) {
        this.error = apiErrorMessage(error);
      }
    },
    editTask(task) {
      this.currentTask = { ...task };
      this.isEditing = true;
    },
    resetForm() {
      this.currentTask = { ...emptyTask() };
      this.isEditing = false;
    }
  }
};
</script>