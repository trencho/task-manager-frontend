import { DEFAULT_TASK_PRIORITY, TASK_PRIORITIES, priorityLabel } from '@/constants/taskPriority';
import { DEFAULT_TASK_STATUS, TASK_STATUSES, statusLabel } from '@/constants/taskStatus';

/**
 * These two files mirror the backend enums. A value that drifts out of step is sent verbatim to
 * the API and rejected there, so the labels fall back to the raw value rather than rendering
 * `undefined` at the user.
 */
describe('constants/taskStatus', () => {
    it('Carries exactly the backend TaskStatus values', () => {
        expect(TASK_STATUSES.map((s) => s.value)).toEqual(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
    });

    it('Defaults to a value it knows', () => {
        expect(TASK_STATUSES.map((s) => s.value)).toContain(DEFAULT_TASK_STATUS);
    });

    it('Labels a known status', () => {
        expect(statusLabel('IN_PROGRESS')).toBe('In progress');
    });

    it('Falls back to the raw value for an unknown status', () => {
        expect(statusLabel('ARCHIVED')).toBe('ARCHIVED');
        expect(statusLabel(undefined)).toBeUndefined();
    });
});

describe('constants/taskPriority', () => {
    it('Carries exactly the backend Priority values', () => {
        expect(TASK_PRIORITIES.map((p) => p.value)).toEqual(['LOW', 'MEDIUM', 'HIGH']);
    });

    it('Defaults to a value it knows', () => {
        expect(TASK_PRIORITIES.map((p) => p.value)).toContain(DEFAULT_TASK_PRIORITY);
    });

    it('Labels a known priority', () => {
        expect(priorityLabel('HIGH')).toBe('High');
    });

    it('Falls back to the raw value for an unknown priority', () => {
        expect(priorityLabel('URGENT')).toBe('URGENT');
        expect(priorityLabel(undefined)).toBeUndefined();
    });
});
