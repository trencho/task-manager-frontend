import {shallowMount} from '@vue/test-utils';
import TaskForm from '@/components/TaskForm.vue';
import {TASK_STATUSES} from '@/constants/taskStatus';

const mountForm = (task = {}, isEditing = false) => shallowMount(TaskForm, {
    props: {
        task: {title: '', description: '', dueDate: '', status: 'PENDING', ...task},
        isEditing
    }
});

describe('TaskForm.vue', () => {
    it('Offers every status the backend accepts', () => {
        const options = mountForm().findAll('#task-status option');

        expect(options).toHaveLength(TASK_STATUSES.length);
        expect(options.map((o) => o.element.value)).toEqual(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
    });

    it('Preselects the task\'s current status when editing', () => {
        const wrapper = mountForm({status: 'IN_PROGRESS'}, true);

        expect(wrapper.find('#task-status').element.value).toBe('IN_PROGRESS');
    });

    // The whole point of the feature: before this, a task could never leave PENDING.
    it('Emits the chosen status with the task', async () => {
        const wrapper = mountForm({title: 'Write tests', status: 'PENDING'}, true);

        await wrapper.find('#task-status').setValue('COMPLETED');
        await wrapper.find('form').trigger('submit');

        const [[submitted]] = wrapper.emitted('submit-task');
        expect(submitted.status).toBe('COMPLETED');
        expect(submitted.title).toBe('Write tests');
    });

    it('Labels the button by mode', () => {
        expect(mountForm({}, false).find('button').text()).toContain('Create');
        expect(mountForm({}, true).find('button').text()).toContain('Update');
    });
});
