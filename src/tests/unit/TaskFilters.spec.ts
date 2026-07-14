import { mount } from '@vue/test-utils';
import TaskFilters from '@/components/TaskFilters.vue';
import { emptyFilters } from '@/constants/taskFilters';
import type { Filters } from '@/types';

describe('components/TaskFilters.vue', () => {
    const mountFilters = () => mount(TaskFilters);

    it('Starts with every filter empty', () => {
        expect(emptyFilters()).toEqual({ q: '', status: '', priority: '', dueBefore: '', sort: '' });
    });

    it('Offers an "Any" choice for status and priority, so a filter can be cleared', () => {
        const wrapper = mountFilters();
        const anyStatus = wrapper.find('#filter-status').findAll('option')[0];
        const anyPriority = wrapper.find('#filter-priority').findAll('option')[0];

        expect(anyStatus.text()).toBe('Any');
        expect(anyStatus.attributes('value')).toBe('');
        expect(anyPriority.text()).toBe('Any');
        expect(anyPriority.attributes('value')).toBe('');
    });

    it('Lists every status and priority the backend accepts', () => {
        const wrapper = mountFilters();
        const values = (selector: string) => wrapper.find(selector).findAll('option')
            .map((o) => o.attributes('value'))
            .filter(Boolean);

        expect(values('#filter-status')).toEqual(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
        expect(values('#filter-priority')).toEqual(['LOW', 'MEDIUM', 'HIGH']);
    });

    /**
     * The draft is local until submit, so typing in the search box does not fire a request per
     * keystroke.
     */
    it('Emits nothing until the form is submitted', async () => {
        const wrapper = mountFilters();

        await wrapper.find('#filter-q').setValue('groceries');
        expect(wrapper.emitted('apply')).toBeUndefined();

        await wrapper.find('form').trigger('submit');
        expect(wrapper.emitted('apply')).toHaveLength(1);
    });

    it('Emits everything the user selected', async () => {
        const wrapper = mountFilters();

        await wrapper.find('#filter-q').setValue('groceries');
        await wrapper.find('#filter-status').setValue('COMPLETED');
        await wrapper.find('#filter-priority').setValue('HIGH');
        await wrapper.find('#filter-due-before').setValue('2026-07-15');
        await wrapper.find('#filter-sort').setValue('dueDate,asc');
        await wrapper.find('form').trigger('submit');

        expect(wrapper.emitted('apply')![0][0]).toEqual({
            q: 'groceries',
            status: 'COMPLETED',
            priority: 'HIGH',
            dueBefore: '2026-07-15',
            sort: 'dueDate,asc'
        });
    });

    it('Emits a copy, so the parent cannot mutate the draft through it', async () => {
        const wrapper = mountFilters();

        await wrapper.find('#filter-q').setValue('groceries');
        await wrapper.find('form').trigger('submit');
        const emitted = wrapper.emitted('apply')![0][0] as Filters;

        emitted.q = 'tampered';

        // Re-submitting proves the internal draft was untouched by the mutation above.
        await wrapper.find('form').trigger('submit');
        const resubmitted = wrapper.emitted('apply')![1][0] as Filters;
        expect(resubmitted.q).toBe('groceries');
    });

    it('Reset clears the fields and emits the empty filter set', async () => {
        const wrapper = mountFilters();

        await wrapper.find('#filter-q').setValue('groceries');
        await wrapper.find('#filter-status').setValue('COMPLETED');
        await wrapper.findAll('button').find((b) => b.text() === 'Reset')!.trigger('click');

        expect(wrapper.emitted('apply')!.at(-1)![0]).toEqual(emptyFilters());
        expect((wrapper.find('#filter-q').element as HTMLInputElement).value).toBe('');
        expect((wrapper.find('#filter-status').element as HTMLSelectElement).value).toBe('');
    });
});
