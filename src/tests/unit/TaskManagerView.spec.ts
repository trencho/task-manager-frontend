import { vi, type Mock } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

import TaskManagerView from '@/views/TaskManagerView.vue';
import axiosInstance from '@/utils/axiosSetup';
import type { Task } from '@/types';

const api = axiosInstance as unknown as { get: Mock; post: Mock; put: Mock; delete: Mock };

const page = (content: Task[] = [], totalPages = 1) => ({
    data: { content, page: { totalPages } }
});

const task = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    title: 'Buy groceries',
    description: 'Milk',
    dueDate: '2026-07-12',
    status: 'PENDING',
    priority: 'LOW',
    ...overrides
});

// The last request's URL, split into path and decoded parameters.
const lastGet = () => {
    const url = api.get.mock.calls.at(-1)![0] as string;
    const [path, query] = url.split('?');
    return { path, params: Object.fromEntries(new URLSearchParams(query)) };
};

describe('views/TaskManagerView.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue(page([task()]));
        api.post.mockResolvedValue({ data: task() });
        api.put.mockResolvedValue({ data: task() });
        api.delete.mockResolvedValue({});
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    const mountView = async () => {
        const wrapper = mount(TaskManagerView);
        await flushPromises();
        return wrapper;
    };

    it('Fetches the first page on mount, with no filter parameters', async () => {
        await mountView();

        const { path, params } = lastGet();
        expect(path).toBe('/api/tasks');
        expect(params).toEqual({ page: '0', size: '10' });
    });

    it('Renders the tasks it fetched', async () => {
        const wrapper = await mountView();
        expect(wrapper.text()).toContain('Buy groceries');
        expect(wrapper.text()).toContain('Low');
    });

    /**
     * Sending `status=` would bind to an empty TaskStatus on the backend and fail conversion.
     */
    it('Omits empty filters from the query string', async () => {
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskFilters' }).vm.$emit('apply', {
            q: '', status: 'COMPLETED', priority: '', dueBefore: '', sort: ''
        });
        await flushPromises();

        const { params } = lastGet();
        expect(params).toEqual({ page: '0', size: '10', status: 'COMPLETED' });
        expect(params).not.toHaveProperty('q');
        expect(params).not.toHaveProperty('priority');
    });

    it('Sends every filter it is given', async () => {
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskFilters' }).vm.$emit('apply', {
            q: 'groceries', status: 'PENDING', priority: 'LOW', dueBefore: '2026-07-15', sort: 'dueDate,asc'
        });
        await flushPromises();

        expect(lastGet().params).toEqual({
            page: '0',
            size: '10',
            q: 'groceries',
            status: 'PENDING',
            priority: 'LOW',
            dueBefore: '2026-07-15',
            sort: 'dueDate,asc'
        });
    });

    it('Encodes a search term rather than letting it inject a parameter', async () => {
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskFilters' }).vm.$emit('apply', {
            q: 'a&size=999', status: '', priority: '', dueBefore: '', sort: ''
        });
        await flushPromises();

        const { params } = lastGet();
        expect(params.q).toBe('a&size=999');
        expect(params.size).toBe('10');
    });

    it('Returns to the first page when a filter changes', async () => {
        api.get.mockResolvedValue(page([task()], 5));
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('change-page', 3);
        await flushPromises();
        expect(lastGet().params.page).toBe('3');

        await wrapper.findComponent({ name: 'TaskFilters' }).vm.$emit('apply', {
            q: 'x', status: '', priority: '', dueBefore: '', sort: ''
        });
        await flushPromises();
        expect(lastGet().params.page).toBe('0');
    });

    /**
     * Deleting the last task on the last page used to leave the user on a page that no longer
     * existed, looking at an empty list.
     */
    it('Steps back when the current page no longer exists', async () => {
        api.get.mockResolvedValue(page([task()], 3));
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('change-page', 2);
        await flushPromises();

        // The page count drops to 2, so page index 2 is now out of range.
        api.get.mockResolvedValue(page([task()], 2));
        await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('change-page', 2);
        await flushPromises();

        expect(lastGet().params.page).toBe('1');
        // Page index 1 of 2 is rendered by TaskList as "Page 2 of 2".
        expect(wrapper.text()).toContain('Page 2 of 2');
    });

    it('Creates a task and refetches rather than appending it locally', async () => {
        const wrapper = await mountView();
        const before = api.get.mock.calls.length;

        await wrapper.findComponent({ name: 'TaskForm' }).vm.$emit('submit-task', task({ id: undefined }));
        await flushPromises();

        expect(api.post).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
            title: 'Buy groceries',
            priority: 'LOW'
        }));
        expect(api.get.mock.calls.length).toBeGreaterThan(before);
    });

    it('Updates a task', async () => {
        const wrapper = await mountView();

        // Enter edit mode through the real UI event, then submit the edited task.
        await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('edit-task', task({ id: '7' }));
        await wrapper.findComponent({ name: 'TaskForm' }).vm.$emit('submit-task', task({ id: '7' }));
        await flushPromises();

        expect(api.put).toHaveBeenCalledWith('/api/tasks/7', expect.objectContaining({ id: '7' }));
    });

    it('Deletes a task', async () => {
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('delete-task', '1');
        await flushPromises();

        expect(api.delete).toHaveBeenCalledWith('/api/tasks/1');
    });

    it.each([
        ['fetch', () => api.get.mockRejectedValue({ response: { data: 'fetch blew up' } }), 'fetch blew up'],
        ['create', () => api.post.mockRejectedValue({ response: { data: 'create blew up' } }), 'create blew up'],
        ['update', () => api.put.mockRejectedValue({ response: { data: 'update blew up' } }), 'update blew up'],
        ['delete', () => api.delete.mockRejectedValue({ response: { data: 'delete blew up' } }), 'delete blew up']
    ])('Shows the error banner when %s fails', async (action, arrange, expected) => {
        const wrapper = await mountView();
        arrange();

        if (action === 'fetch') {
            await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('change-page', 1);
        } else if (action === 'create') {
            await wrapper.findComponent({ name: 'TaskForm' }).vm.$emit('submit-task', task());
        } else if (action === 'update') {
            await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('edit-task', task({ id: '7' }));
            await wrapper.findComponent({ name: 'TaskForm' }).vm.$emit('submit-task', task({ id: '7' }));
        } else {
            await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('delete-task', '1');
        }
        await flushPromises();

        expect(wrapper.find('[role="alert"]').text()).toContain(expected);
    });

    it('Renders a message rather than crashing when the API is unreachable', async () => {
        api.get.mockRejectedValue(new Error('Network Error'));

        const wrapper = mount(TaskManagerView);
        await flushPromises();

        expect(wrapper.find('[role="alert"]').text()).toContain('Network Error');
    });
});
