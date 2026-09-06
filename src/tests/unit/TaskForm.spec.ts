import { shallowMount } from '@vue/test-utils';
import TaskForm from '@/components/TaskForm.vue';
import { TASK_STATUSES } from '@/constants/taskStatus';
import type { NewTask } from '@/types';

const mountForm = (task: Partial<NewTask> = {}, isEditing = false) => {
    const props: { task: NewTask; isEditing: boolean } = {
        task: { title: '', description: '', dueDate: '', status: 'PENDING', priority: 'MEDIUM', ...task },
        isEditing
    };
    return shallowMount(TaskForm, { props });
};

describe('TaskForm.vue', () => {
    it('Offers every status the backend accepts', () => {
        const options = mountForm().findAll('#task-status option');

        expect(options).toHaveLength(TASK_STATUSES.length);
        expect(options.map((o) => (o.element as HTMLOptionElement).value)).toEqual(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
    });

    it('Preselects the task\'s current status when editing', () => {
        const wrapper = mountForm({ status: 'IN_PROGRESS' }, true);

        expect((wrapper.find('#task-status').element as HTMLSelectElement).value).toBe('IN_PROGRESS');
    });

    // The whole point of the feature: before this, a task could never leave PENDING.
    it('Emits the chosen status with the task', async () => {
        const wrapper = mountForm({ title: 'Write tests', status: 'PENDING' }, true);

        await wrapper.find('#task-status').setValue('COMPLETED');
        await wrapper.find('form').trigger('submit');

        const submitted = wrapper.emitted('submit-task')?.[0]?.[0] as NewTask;
        expect(submitted.status).toBe('COMPLETED');
        expect(submitted.title).toBe('Write tests');
    });

    // Drives every remaining field through its v-model, so the title/description/due-date/priority
    // bindings are exercised the way a user fills the form, not reached past with props.
    it('Emits the values typed into every field', async () => {
        const wrapper = mountForm({ status: 'PENDING' }, false);

        await wrapper.find('input').setValue('Buy milk');
        await wrapper.find('textarea').setValue('2 percent');
        await wrapper.find('input[type="date"]').setValue('2026-08-01');
        await wrapper.find('#task-priority').setValue('HIGH');
        await wrapper.find('form').trigger('submit');

        const submitted = wrapper.emitted('submit-task')?.[0]?.[0] as NewTask;
        expect(submitted.title).toBe('Buy milk');
        expect(submitted.description).toBe('2 percent');
        expect(submitted.dueDate).toBe('2026-08-01');
        expect(submitted.priority).toBe('HIGH');
    });

    it('Emits the tags typed into the box, as a list', async () => {
        const wrapper = mountForm({title: 'Write tests'});

        await wrapper.find('#task-tags').setValue('work, urgent');
        await wrapper.find('form').trigger('submit');

        const submitted = wrapper.emitted('submit-task')?.[0]?.[0] as NewTask;
        expect(submitted.tags).toEqual(['work', 'urgent']);
    });

    /**
     * An empty list is meaningful and is NOT the same as omitting the field: the server reads an
     * absent `tags` as leave-alone and an empty one as clear, so emptying the box is the only way
     * a user can remove every tag.
     */
    it('Emits an empty list when the box is cleared', async () => {
        const wrapper = mountForm({tags: ['work']}, true);

        await wrapper.find('#task-tags').setValue('');
        await wrapper.find('form').trigger('submit');

        const submitted = wrapper.emitted('submit-task')?.[0]?.[0] as NewTask;
        expect(submitted.tags).toEqual([]);
    });

    it('Shows the tags of the task it is given, and of the task it is switched to', async () => {
        const wrapper = mountForm({tags: ['work']}, true);
        expect((wrapper.find('#task-tags').element as HTMLInputElement).value).toBe('work');

        // The parent swaps the whole object in when the user picks a different task to edit.
        await wrapper.setProps({
            task: {title: 'Other', description: '', dueDate: '', status: 'PENDING', priority: 'LOW', tags: ['home']}
        });

        expect((wrapper.find('#task-tags').element as HTMLInputElement).value).toBe('home');
    });

    it('Labels the button by mode', () => {
        expect(mountForm({}, false).find('button').text()).toContain('Create');
        expect(mountForm({}, true).find('button').text()).toContain('Update');
    });
});
