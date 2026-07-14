// Mirrors com.project.taskmanager.enums.Priority on the backend. The values are sent
// verbatim to the API, so they must stay exactly in step with that enum.
export const TASK_PRIORITIES = [
    {value: 'LOW', label: 'Low'},
    {value: 'MEDIUM', label: 'Medium'},
    {value: 'HIGH', label: 'High'}
] as const;

// Derived from the array above so the values stay the single source of truth.
export type TaskPriority = (typeof TASK_PRIORITIES)[number]['value'];

export const DEFAULT_TASK_PRIORITY: TaskPriority = 'MEDIUM';

export const priorityLabel = (value: string): string =>
    TASK_PRIORITIES.find((priority) => priority.value === value)?.label ?? value;
