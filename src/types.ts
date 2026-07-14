import type { TaskStatus } from '@/constants/taskStatus';
import type { TaskPriority } from '@/constants/taskPriority';

export type { TaskStatus, TaskPriority };

// A persisted task as returned by the API.
export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
}

// A task being created or edited in the form — no server id yet.
export type NewTask = Omit<Task, 'id'>;

// Spring Data PagedModel shape: totalPages is nested under `page`, not top-level.
export interface PagedTasks {
  content: Task[];
  page: { totalPages: number };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Filter-bar state. status/priority are strings, not the enums — '' means "any".
export interface Filters {
  q: string;
  status: string;
  priority: string;
  dueBefore: string;
  sort: string;
}
