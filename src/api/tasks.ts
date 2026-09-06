import axiosInstance from '@/utils/axiosSetup';
import type { Filters, NewTask, PagedTasks, Task } from '@/types';

export const PAGE_SIZE = 10;

/**
 * Empty filters are omitted entirely. Sending `status=` would bind to an empty TaskStatus on the
 * backend and fail conversion, and URLSearchParams encodes the rest, so a search for "a&b" cannot
 * inject a parameter.
 *
 * Exported and pure — `(filters, page, size) => string` — because it was the one piece of real
 * logic buried in the view, reachable only by mounting a component and reading the URL a mock was
 * called with.
 */
export const buildQuery = (filters: Filters, page: number, size: number): string => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, value);
    }
  }
  return params.toString();
};

export const listTasks = (filters: Filters, page: number) =>
  axiosInstance.get<PagedTasks>(`/api/tasks?${buildQuery(filters, page, PAGE_SIZE)}`);

export const createTask = (task: NewTask | Task) => axiosInstance.post('/api/tasks', task);

export const updateTask = (id: string, task: NewTask | Task) =>
  axiosInstance.put(`/api/tasks/${id}`, task);

export const deleteTask = (id: string) => axiosInstance.delete(`/api/tasks/${id}`);
