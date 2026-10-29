<script setup lang="ts">
withDefaults(defineProps<{ lines?: number }>(), { lines: 3 });
</script>

<template>
  <div aria-busy="true" aria-live="polite" class="flex flex-col gap-3">
    <!-- The busy state is the message; the bars are decoration, shaped like
         the content that is coming (ui-guide §7). -->
    <span class="sr-only">Loading…</span>
    <div
      v-for="line in lines"
      :key="line"
      aria-hidden="true"
      class="h-4 animate-pulse rounded-sm bg-subtle motion-reduce:animate-none"
      :class="line === lines ? 'w-2/3' : 'w-full'"
    />
  </div>
</template>
