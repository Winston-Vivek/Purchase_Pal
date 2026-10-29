<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps<{ errors: Record<string, string> }>();

const summary = ref<HTMLElement | null>(null);

const entries = computed(() => Object.entries(props.errors));
const hasErrors = computed(() => entries.value.length > 0);

/**
 * Focus moves here after a failed save, so the reason is never off-screen
 * above the fold the user is looking at (ui-guide §6).
 */
watch(
  () => props.errors,
  async () => {
    if (!hasErrors.value) return;
    await nextTick();
    summary.value?.focus();
  },
  { immediate: true, deep: true },
);

function focusField(event: Event, field: string): void {
  event.preventDefault();
  document.getElementById(field)?.focus();
}
</script>

<template>
  <div
    v-if="hasErrors"
    ref="summary"
    role="alert"
    tabindex="-1"
    class="rounded-md border border-danger bg-bad-bg p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
  >
    <p class="font-semibold text-bad-fg">
      {{ entries.length === 1 ? 'There is 1 problem' : `There are ${entries.length} problems` }}
    </p>
    <ul class="mt-2 flex list-disc flex-col gap-1 pl-5">
      <li v-for="[field, message] in entries" :key="field">
        <a
          :href="`#${field}`"
          class="cursor-pointer text-bad-fg underline"
          @click="focusField($event, field)"
        >
          {{ message }}
        </a>
      </li>
    </ul>
  </div>
</template>
