<template>
  <form @submit.prevent="submitTask">
    <div>
      <label>Title:</label>
      <input
        v-model="task.title"
        required
      >
    </div>
    <div>
      <label>Description:</label>
      <textarea v-model="task.description" />
    </div>
    <div>
      <label>Due Date:</label>
      <input
        v-model="task.dueDate"
        type="date"
      >
    </div>
    <div>
      <label for="task-status">Status:</label>
      <select
        id="task-status"
        v-model="task.status"
      >
        <option
          v-for="option in statuses"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
    <div>
      <label for="task-priority">Priority:</label>
      <select
        id="task-priority"
        v-model="task.priority"
      >
        <option
          v-for="option in priorities"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
    <div>
      <label for="task-tags">Tags:</label>
      <input
        id="task-tags"
        v-model="tagsText"
        type="text"
        placeholder="Comma separated, e.g. work, urgent"
      >
    </div>
    <button type="submit">
      {{ isEditing ? 'Update' : 'Create' }} Task
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { TASK_PRIORITIES } from '@/constants/taskPriority';
import { TASK_STATUSES } from '@/constants/taskStatus';
import { formatTags, parseTags } from '@/utils/tags';
import type { NewTask, Task } from '@/types';

// The parent owns the task object; this form edits it in place and emits it back on submit.
const props = withDefaults(defineProps<{
  task: NewTask | Task;
  isEditing?: boolean;
}>(), { isEditing: false });

const emit = defineEmits<{ 'submit-task': [task: NewTask | Task] }>();

const statuses = TASK_STATUSES;
const priorities = TASK_PRIORITIES;

// Held as raw text rather than bound through a computed setter. A setter would re-parse on every
// keystroke and write the result straight back into the input, so typing the comma in
// "work, urgent" would delete itself before the next character arrived.
const tagsText = ref(formatTags(props.task.tags));

// The parent swaps the whole object in when the user picks a task to edit, so the box has to
// follow. Watching the reference is enough: nothing mutates tags in place.
watch(() => props.task, (task) => {
  tagsText.value = formatTags(task.tags);
});

const submitTask = (): void => {
  // An EMPTY list is meaningful and is not the same as omitting the field: the server reads an
  // absent tags field as leave-alone and an empty one as clear, so clearing the box is how a user
  // removes every tag.
  props.task.tags = parseTags(tagsText.value);
  emit('submit-task', props.task);
};
</script>
