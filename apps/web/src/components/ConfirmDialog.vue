<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import BaseButton from './BaseButton.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    body?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  { confirmLabel: 'Delete', cancelLabel: 'Cancel' },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const dialog = ref<HTMLElement | null>(null);
/** Where focus came from, so it can be put back (ui-guide §8). */
let opener: HTMLElement | null = null;

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function focusables(): HTMLElement[] {
  return dialog.value ? [...dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) return;

  if (event.key === 'Escape') {
    emit('cancel');
    return;
  }

  if (event.key !== 'Tab') return;

  // Wrap at the ends, so Tab cannot walk out of the dialog and onto the page
  // behind it, which is invisible to a sighted user and silent to a reader.
  const items = focusables();
  if (items.length === 0) return;

  const first = items[0] as HTMLElement;
  const last = items[items.length - 1] as HTMLElement;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(
  () => props.open,
  async (isOpen, wasOpen) => {
    if (isOpen) {
      opener = document.activeElement as HTMLElement | null;
      document.addEventListener('keydown', onKeydown);
      await nextTick();
      focusables()[0]?.focus();
      return;
    }

    if (wasOpen) {
      document.removeEventListener('keydown', onKeydown);
      opener?.focus();
      opener = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="emit('cancel')"
    >
      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="w-full max-w-md rounded-lg border border-border bg-surface p-6"
      >
        <h2 class="font-heading text-lg font-semibold text-fg">{{ title }}</h2>
        <!-- ui-guide §7: name the thing AND what goes with it. -->
        <p v-if="body" class="mt-2 text-muted-fg">{{ body }}</p>

        <div class="mt-6 flex justify-end gap-3">
          <BaseButton variant="secondary" @click="emit('cancel')">{{ cancelLabel }}</BaseButton>
          <BaseButton variant="danger" @click="emit('confirm')">{{ confirmLabel }}</BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
