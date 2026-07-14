import type { Filters } from '@/types';

// Extracted from TaskFilters.vue: a <script setup> block cannot export module-level values
// alongside the component, and both the component and its consumers (TaskManagerView, tests)
// need these.
export const SORT_OPTIONS = [
  {value: '', label: 'Default'},
  {value: 'dueDate,asc', label: 'Due date (soonest first)'},
  {value: 'dueDate,desc', label: 'Due date (latest first)'},
  {value: 'title,asc', label: 'Title (A-Z)'},
  {value: 'title,desc', label: 'Title (Z-A)'}
] as const;

export const emptyFilters = (): Filters => ({
  q: '',
  status: '',
  priority: '',
  dueBefore: '',
  sort: ''
});
