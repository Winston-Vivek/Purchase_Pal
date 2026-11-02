<script setup lang="ts">
import { EllipsisVertical } from '@lucide/vue';
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    /** How the menu is found in a test, and told apart on a page with several. */
    testId?: string;
    /** Replaces the icon-button styling when the trigger is something else,
     *  such as the account block in the sidebar. */
    triggerClass?: string;
  }>(),
  { testId: 'row-menu', triggerClass: '' },
);

const ICON_TRIGGER =
  'flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden';

/** Enough room to show all three items; below this the menu flips above the
 *  trigger rather than hanging off the bottom of the window. */
const ESTIMATED_HEIGHT = 150;
const GAP = 4;

const open = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const list = ref<HTMLElement | null>(null);
const position = ref({ top: 0, right: 0 });

const items = (): HTMLElement[] =>
  Array.from(list.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

/**
 * Positions the menu against the trigger in viewport coordinates.
 *
 * It is rendered at the end of <body>, not beside the button: the table card
 * is overflow-hidden so its corners stay rounded, and that quietly clipped
 * the menu — on the last row only the first item survived (NFR-14).
 */
function place(): void {
  const box = trigger.value?.getBoundingClientRect();
  if (!box) return;

  const below = window.innerHeight - box.bottom;
  const flip = below < ESTIMATED_HEIGHT && box.top > below;

  position.value = {
    top: flip ? box.top - ESTIMATED_HEIGHT - GAP : box.bottom + GAP,
    right: window.innerWidth - box.right,
  };
}

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

/** Fixed coordinates go stale the moment anything scrolls, so they are
 *  recomputed rather than left pointing at where the row used to be. */
function onViewportChange(): void {
  place();
}

function toggle(): void {
  if (open.value) {
    close();
    return;
  }

  place();
  open.value = true;
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    window.removeEventListener('scroll', onViewportChange, true);
    window.removeEventListener('resize', onViewportChange);
    return;
  }

  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  window.addEventListener('scroll', onViewportChange, true);
  window.addEventListener('resize', onViewportChange);
  await nextTick();
  items()[0]?.focus();
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  window.removeEventListener('scroll', onViewportChange, true);
  window.removeEventListener('resize', onViewportChange);
});
</script>

<template>
  <!-- The click stops here: the row around it navigates on click. -->
  <div class="contents" @click.stop>
    <button
      ref="trigger"
      type="button"
      :data-testid="props.testId"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      :class="props.triggerClass === '' ? ICON_TRIGGER : props.triggerClass"
      @click="toggle"
    >
      <!-- The three dots are the default; a caller with something better to
           click, like an avatar already on screen, replaces them. -->
      <slot name="trigger">
        <EllipsisVertical :size="20" aria-hidden="true" />
      </slot>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="list"
        role="menu"
        :aria-label="label"
        :style="{ top: `${position.top}px`, right: `${position.right}px` }"
        class="fixed z-50 flex min-w-40 flex-col rounded-md border border-border bg-surface py-1 shadow-sm"
        @keydown="onKeydown"
        @click="close(false)"
      >
        <slot />
      </div>
    </Teleport>
  </div>
</template>
