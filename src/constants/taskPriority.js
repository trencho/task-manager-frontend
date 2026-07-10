// Mirrors com.project.taskmanager.enums.Priority on the backend. The values are sent
// verbatim to the API, so they must stay exactly in step with that enum.
export const TASK_PRIORITIES = [
    {value: 'LOW', label: 'Low'},
    {value: 'MEDIUM', label: 'Medium'},
    {value: 'HIGH', label: 'High'}
];

export const DEFAULT_TASK_PRIORITY = 'MEDIUM';

export const priorityLabel = (value) =>
    TASK_PRIORITIES.find((priority) => priority.value === value)?.label ?? value;
