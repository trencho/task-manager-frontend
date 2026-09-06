import { vi, type Mock } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

import TaskManagerView from '@/views/TaskManagerView.vue';
import axiosInstance from '@/utils/axiosSetup';
import { emptyFilters } from '@/constants/taskFilters';
import type { Filters, Task } from '@/types';

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
    tags: ['errand'],
    ...overrides
});

// The five-key literals the filter tests used to emit are gone: Filters gained a `tag` key, and
// spreading the empty set keeps each test naming only the filter it is about.
const filters = (overrides: Partial<Filters> = {}): Filters => ({ ...emptyFilters(), ...overrides });

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

        await wrapper.findComponent({ name: 'TaskFilters' }).vm.$emit('apply', filters({ status: 'COMPLETED' }));
        await flushPromises();

        const { params } = lastGet();
        expect(params).toEqual({ page: '0', size: '10', status: 'COMPLETED' });
        expect(params).not.toHaveProperty('q');
        expect(params).not.toHaveProperty('priority');
    });

    it('Sends every filter it is given', async () => {
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskFilters' }).vm.$emit('apply', filters({
            q: 'groceries', status: 'PENDING', priority: 'LOW', dueBefore: '2026-07-15',
            sort: 'dueDate,asc', tag: 'work'
        }));
        await flushPromises();

        expect(lastGet().params).toEqual({
            page: '0',
            size: '10',
            q: 'groceries',
            status: 'PENDING',
            priority: 'LOW',
            dueBefore: '2026-07-15',
            sort: 'dueDate,asc',
            tag: 'work'
        });
    });

    it('Encodes a search term rather than letting it inject a parameter', async () => {
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskFilters' }).vm.$emit('apply', filters({ q: 'a&size=999' }));
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

        await wrapper.findComponent({ name: 'TaskFilters' }).vm.$emit('apply', filters({ q: 'x' }));
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

    it('Clears the error when the banner is dismissed', async () => {
        // The @dismiss handler in TaskManagerView.vue is `error = ''`. This was the third consumer
        // of ErrorBanner and the second with no test for it: the banner could emit into a parent
        // that ignored the event and nothing would have failed until a user clicked.
        api.get.mockRejectedValue(new Error('Network Error'));

        const wrapper = mount(TaskManagerView);
        await flushPromises();
        expect(wrapper.find('[role="alert"]').exists()).toBe(true);

        await wrapper.find('.error-banner__dismiss').trigger('click');

        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    /**
     * The whole point of the tags work: ?tag= has been served since tags shipped and no client
     * ever sent one, so the filter selected on a field nothing populated.
     */
    it('Sends the tag filter the backend has always accepted', async () => {
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskFilters' }).vm.$emit('apply', filters({ tag: 'urgent' }));
        await flushPromises();

        expect(lastGet().params).toEqual({ page: '0', size: '10', tag: 'urgent' });
    });

    /**
     * The trap this pair exists for. `editTask` shallow-copies the task, which would hand the form
     * the SAME array the list row renders -- so editing the tag box would rewrite the list before
     * anything was submitted, and cancelling would leave the change behind.
     */
    it('Gives the form its own copy of the tags', async () => {
        const wrapper = await mountView();
        const original = task({ id: '7', tags: ['work'] });

        await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('edit-task', original);
        await wrapper.vm.$nextTick();

        const form = wrapper.findComponent({ name: 'TaskForm' });
        const handed = (form.props('task') as Task).tags;
        expect(handed).toEqual(['work']);
        expect(handed).not.toBe(original.tags);
    });

    // The server sends no tags field for a task carrying none, so the copy above has to cope with
    // an absent list rather than spreading undefined.
    it('Hands the form an empty list when the task has no tags', async () => {
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskList' }).vm.$emit('edit-task', task({ tags: undefined }));
        await wrapper.vm.$nextTick();

        expect((wrapper.findComponent({ name: 'TaskForm' }).props('task') as Task).tags).toEqual([]);
    });

    it('Sends the tags it was given when creating a task', async () => {
        const wrapper = await mountView();

        await wrapper.findComponent({ name: 'TaskForm' }).vm.$emit('submit-task', task({ tags: ['work', 'urgent'] }));
        await flushPromises();

        expect(api.post).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
            tags: ['work', 'urgent']
        }));
    });

    it('Renders a message rather than crashing when the API is unreachable', async () => {
        api.get.mockRejectedValue(new Error('Network Error'));

        const wrapper = mount(TaskManagerView);
        await flushPromises();

        expect(wrapper.find('[role="alert"]').text()).toContain('Network Error');
    });
});
