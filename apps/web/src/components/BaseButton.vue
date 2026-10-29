<script setup lang="ts">
import { Loader2 } from '@lucide/vue';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    loadingLabel?: string;
  }>(),
  { variant: 'primary', type: 'button', loading: false, disabled: false, loadingLabel: 'Saving…' },
);

const emit = defineEmits<{ click: [MouseEvent] }>();

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-input bg-surface text-fg hover:bg-subtle',
  ghost: 'text-primary hover:bg-primary-tint',
  danger: 'bg-danger text-white hover:bg-danger-hover',
} as const;

const inert = computed(() => props.loading || props.disabled);

function onClick(event: MouseEvent): void {
  // Guarded as well as disabled: a double submit while saving is the easiest
  // way to create two purchases from one click.
  if (inert.value) return;
  emit('click', event);
}
</script>

<template>
  <button
    :type="type"
    :disabled="inert"
    :aria-busy="loading || undefined"
    :aria-disabled="inert || undefined"
    class="relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-base font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
    :class="VARIANTS[variant]"
    @click="onClick"
  >
    <!-- The label stays in the layout while loading, so the button keeps its
         width and the page does not jump mid-save (ui-guide §4). -->
    <span :class="loading ? 'invisible' : ''"><slot /></span>

    <span v-if="loading" class="absolute inset-0 flex items-center justify-center gap-2">
      <Loader2 :size="18" aria-hidden="true" class="animate-spin motion-reduce:animate-none" />
      {{ loadingLabel }}
    </span>
  </button>
</template>
