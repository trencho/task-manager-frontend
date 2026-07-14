import { vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import TaskList from '@/components/TaskList.vue';
import type { Task } from '@/types';

const tasks: Task[] = [
    {id: '1', title: 'First', description: 'desc one', dueDate: '2026-01-01', status: 'PENDING', priority: 'LOW'},
    {id: '2', title: 'Second', description: 'desc two', dueDate: '2026-02-01', status: 'COMPLETED', priority: 'HIGH'}
];

const mountList = (props: Partial<{ tasks: Task[]; page: number; totalPages: number }> = {}) =>
    shallowMount(TaskList, {
        props: {tasks, page: 0, totalPages: 2, ...props}
    });

describe('TaskList.vue', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Renders one row per task', () => {
        expect(mountList().findAll('.task-item')).toHaveLength(2);
    });

    it('Shows each task\'s status as a human label', () => {
        const labels = mountList().findAll('.task-status').map((s) => s.text());

        expect(labels).toEqual(['Pending', 'Completed']);
    });

    it('Falls back to the raw value for an unknown status', () => {
        // Deliberately an invalid status to exercise the statusLabel fallback.
        const wrapper = mountList({tasks: [{...tasks[0], status: 'ARCHIVED'}] as unknown as Task[]});

        expect(wrapper.find('.task-status').text()).toBe('ARCHIVED');
    });

    it('Shows a placeholder and no pagination when there are no tasks', () => {
        const wrapper = mountList({tasks: []});

        expect(wrapper.text()).toContain('No tasks available.');
        expect(wrapper.find('.pagination').exists()).toBe(false);
    });

    it('Emits edit-task with the task that was clicked', async () => {
        const wrapper = mountList();
        await wrapper.findAll('button.edit')[1].trigger('click');

        expect(wrapper.emitted('edit-task')![0]).toEqual([tasks[1]]);
    });

    it('Emits delete-task only after the user confirms', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const wrapper = mountList();

        await wrapper.findAll('.task-item')[0].findAll('button')[1].trigger('click');

        expect(wrapper.emitted('delete-task')![0]).toEqual(['1']);
    });

    it('Does not emit delete-task when the user cancels', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const wrapper = mountList();

        await wrapper.findAll('.task-item')[0].findAll('button')[1].trigger('click');

        expect(wrapper.emitted('delete-task')).toBeUndefined();
    });

    it('Disables Previous on the first page and Next on the last', () => {
        const first = mountList({page: 0, totalPages: 2});
        expect(first.find('.pagination button:first-of-type').attributes('disabled')).toBeDefined();

        const last = mountList({page: 1, totalPages: 2});
        const nextButton = last.findAll('.pagination button')[1];
        expect(nextButton.attributes('disabled')).toBeDefined();
    });

    it('Emits change-page with the neighbouring page', async () => {
        const wrapper = mountList({page: 1, totalPages: 3});
        const [previous, next] = wrapper.findAll('.pagination button');

        await previous.trigger('click');
        await next.trigger('click');

        expect(wrapper.emitted('change-page')![0]).toEqual([0]);
        expect(wrapper.emitted('change-page')![1]).toEqual([2]);
    });
});
