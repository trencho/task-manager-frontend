import { vi, type Mock } from 'vitest';

vi.mock('@/utils/axiosSetup', () => ({
    __esModule: true,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

import * as tasksApi from '@/api/tasks';
import axiosInstance from '@/utils/axiosSetup';
import { emptyFilters } from '@/constants/taskFilters';
import type { Filters } from '@/types';

const api = axiosInstance as unknown as { get: Mock; post: Mock; put: Mock; delete: Mock };

const filters = (overrides: Partial<Filters> = {}): Filters => ({ ...emptyFilters(), ...overrides });

const paramsOf = (query: string) => Object.fromEntries(new URLSearchParams(query));

/**
 * `buildQuery` was reachable only by mounting the whole view and reading the URL a mock had been
 * called with. It is pure -- (filters, page, size) => string -- so it gets driven directly here,
 * which is what makes the encoding cases cheap enough to be worth writing.
 */
describe('api/tasks.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: { content: [], page: { totalPages: 1 } } });
    });

    it('Always carries the page and the size', () => {
        expect(paramsOf(tasksApi.buildQuery(filters(), 2, 25))).toEqual({ page: '2', size: '25' });
    });

    /**
     * Sending `status=` would bind to an empty TaskStatus on the backend and fail conversion, so
     * an untouched filter has to disappear rather than travel empty.
     */
    it('Omits every filter the user left empty', () => {
        const params = paramsOf(tasksApi.buildQuery(filters({ status: 'COMPLETED' }), 0, 10));

        expect(params).toEqual({ page: '0', size: '10', status: 'COMPLETED' });
    });

    it('Sends every filter the user set, tag included', () => {
        const params = paramsOf(tasksApi.buildQuery(filters({
            q: 'groceries', status: 'PENDING', priority: 'LOW',
            dueBefore: '2026-07-15', sort: 'dueDate,asc', tag: 'work'
        }), 1, 10));

        expect(params).toEqual({
            page: '1',
            size: '10',
            q: 'groceries',
            status: 'PENDING',
            priority: 'LOW',
            dueBefore: '2026-07-15',
            sort: 'dueDate,asc',
            tag: 'work'
        });
    });

    it('Encodes a search term rather than letting it inject a parameter', () => {
        const params = paramsOf(tasksApi.buildQuery(filters({ q: 'a&size=999' }), 0, 10));

        expect(params.q).toBe('a&size=999');
        expect(params.size).toBe('10');
    });

    it('Requests the list at the page size the app uses', async () => {
        await tasksApi.listTasks(filters({ tag: 'work' }), 3);

        const [path, query] = (api.get.mock.calls.at(-1)![0] as string).split('?');
        expect(path).toBe('/api/tasks');
        expect(paramsOf(query)).toEqual({ page: '3', size: String(tasksApi.PAGE_SIZE), tag: 'work' });
    });

    it('Addresses a single task by id on write and on delete', async () => {
        const task = {
            title: 'Buy milk', description: '', dueDate: '', status: 'PENDING' as const,
            priority: 'LOW' as const, tags: ['errand']
        };

        await tasksApi.createTask(task);
        await tasksApi.updateTask('7', task);
        await tasksApi.deleteTask('7');

        expect(api.post).toHaveBeenCalledWith('/api/tasks', task);
        expect(api.put).toHaveBeenCalledWith('/api/tasks/7', task);
        expect(api.delete).toHaveBeenCalledWith('/api/tasks/7');
    });
});
