// Mirrors com.project.taskmanager.enums.TaskStatus on the backend. The values are sent
// verbatim to the API, so they must stay exactly in step with that enum.
export const TASK_STATUSES = [
    {value: 'PENDING', label: 'Pending'},
    {value: 'IN_PROGRESS', label: 'In progress'},
    {value: 'COMPLETED', label: 'Completed'}
] as const;

// Derived from the array above so the values stay the single source of truth.
export type TaskStatus = (typeof TASK_STATUSES)[number]['value'];

export const DEFAULT_TASK_STATUS: TaskStatus = 'PENDING';

export const statusLabel = (value: string): string =>
    TASK_STATUSES.find((status) => status.value === value)?.label ?? value;
