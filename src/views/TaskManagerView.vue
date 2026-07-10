<template>
  <div>
    <h2>Task Manager</h2>
    <TaskForm
      :task="currentTask"
      :is-editing="isEditing"
      @submit-task="handleTaskSubmit"
    />
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
import TaskForm from '@/components/TaskForm.vue';
import TaskList from '@/components/TaskList.vue';
import LogoutButton from '@/components/LogoutButton.vue';
import { DEFAULT_TASK_STATUS } from '@/constants/taskStatus';

const emptyTask = () => ({ title: '', description: '', dueDate: '', status: DEFAULT_TASK_STATUS });

export default {
  components: {
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
      totalPages: 0
    };
  },
  mounted() {
    this.fetchTasks();
  },
  methods: {
    async fetchTasks(page = 0) {
      try {
        const response = await axiosInstance.get(`/api/tasks?page=${page}&size=10`);
        this.tasks = response.data.content;
        this.page = page;
        this.totalPages = response.data.page.totalPages;
      } catch (error) {
        alert('Failed to fetch tasks: ' + error);
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
      try {
        const response = await axiosInstance.post('/api/tasks', task);
        this.tasks.push(response.data);
        this.resetForm();
      } catch (error) {
        alert('Failed to create task: ' + error);
      }
    },
    async updateTask(task) {
      try {
        await axiosInstance.put(`/api/tasks/${task.id}`, task);
        this.resetForm();
        this.fetchTasks(this.page);
      } catch (error) {
        alert('Failed to update task: ' + error);
      }
    },
    async deleteTask(id) {
      try {
        await axiosInstance.delete(`/api/tasks/${id}`);
        this.fetchTasks(this.page);
      } catch (error) {
        alert('Failed to delete task: ' + error);
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