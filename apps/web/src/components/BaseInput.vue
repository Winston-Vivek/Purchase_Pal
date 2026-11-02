<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    modelValue: string | number | null;
    type?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    inputmode?: 'text' | 'decimal' | 'numeric' | 'email';
    autocomplete?: string;
    min?: string;
    max?: string;
    disabled?: boolean;
  }>(),
  { type: 'text' },
);

defineEmits<{ 'update:modelValue': [string] }>();

const hintId = computed(() => `${props.id}-hint`);
const errorId = computed(() => `${props.id}-error`);

/** Only ids that exist. Pointing at a missing element announces nothing, and
 *  that is indistinguishable from working (ui-guide §8). */
const describedBy = computed(() => {
  const ids = [props.hint ? hintId.value : null, props.error ? errorId.value : null].filter(
    Boolean,
  );
  return ids.length > 0 ? ids.join(' ') : undefined;
});
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-semibold text-fg">
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>

    <input
      :id="id"
      :type="type"
      :value="modelValue ?? ''"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      :min="min"
      :max="max"
      :required="required || undefined"
      :disabled="disabled || undefined"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="min-h-11 rounded-sm border bg-surface px-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      :class="[
        error ? 'border-danger' : 'border-input',
        disabled ? 'cursor-not-allowed bg-subtle text-muted-fg' : '',
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <p v-if="hint" :id="hintId" class="text-sm text-muted-fg">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="text-sm font-semibold text-danger">{{ error }}</p>
  </div>
</template>
