// Mirrors com.project.taskmanager.enums.TaskStatus on the backend. The values are sent
// verbatim to the API, so they must stay exactly in step with that enum.
export const TASK_STATUSES = [
    {value: 'PENDING', label: 'Pending'},
    {value: 'IN_PROGRESS', label: 'In progress'},
    {value: 'COMPLETED', label: 'Completed'}
];

export const DEFAULT_TASK_STATUS = 'PENDING';

export const statusLabel = (value) =>
    TASK_STATUSES.find((status) => status.value === value)?.label ?? value;
