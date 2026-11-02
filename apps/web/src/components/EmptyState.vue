<script setup lang="ts">
defineProps<{ message: string; detail?: string }>();
</script>

<template>
  <div
    class="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-4 py-12 text-center"
  >
    <!-- ui-guide §7: one sentence of why, then the next action. -->
    <p class="font-heading text-lg font-semibold text-fg">{{ message }}</p>
    <p v-if="detail" class="max-w-prose text-muted-fg">{{ detail }}</p>
    <div class="mt-1"><slot name="action" /></div>
  </div>
</template>
