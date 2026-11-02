<script setup lang="ts">
import { EllipsisVertical } from '@lucide/vue';
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

defineProps<{ label: string }>();

const open = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const list = ref<HTMLElement | null>(null);

const items = (): HTMLElement[] =>
  Array.from(list.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

function close(restoreFocus = true): void {
  if (!open.value) return;
  open.value = false;
  // Without this a keyboard user is dropped on the body and has to tab back
  // through the whole row to get anywhere (ui-guide §8).
  if (restoreFocus) trigger.value?.focus();
}

/** Wraps, so the last item leads back to the first (WAI-ARIA menu pattern). */
function move(step: number): void {
  const all = items();
  if (all.length === 0) return;

  const at = all.indexOf(document.activeElement as HTMLElement);
  all[(at + step + all.length) % all.length]?.focus();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation();
    close();
    return;
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    move(event.key === 'ArrowDown' ? 1 : -1);
  }
}

/** A click anywhere else means "I am done here", including on another row's
 *  menu, which would otherwise leave two open at once. */
function onDocumentPointerDown(event: Event): void {
  const target = event.target as Node;
  if (trigger.value?.contains(target) || list.value?.contains(target)) return;
  close(false);
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    return;
  }

  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  await nextTick();
  items()[0]?.focus();
});

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown, true));
</script>

<template>
  <!-- `relative` so the menu is positioned against the button, and the click
       stops here: the row around it navigates on click. -->
  <div class="relative" @click.stop>
    <button
      ref="trigger"
      type="button"
      data-testid="row-menu"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      class="flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      @click="open = !open"
    >
      <EllipsisVertical :size="20" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      ref="list"
      role="menu"
      :aria-label="label"
      class="absolute right-0 z-20 mt-1 flex min-w-40 flex-col rounded-md border border-border bg-surface py-1 shadow-sm"
      @keydown="onKeydown"
      @click="close(false)"
    >
      <slot />
    </div>
  </div>
</template>
