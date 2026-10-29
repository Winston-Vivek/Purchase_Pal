<script setup lang="ts">
import { LayoutGrid } from '@lucide/vue';

defineProps<{ title: string }>();
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-10">
    <div class="w-full max-w-[400px]">
      <div class="flex items-center gap-2">
        <span class="flex size-9 items-center justify-center rounded-md bg-primary text-white">
          <LayoutGrid :size="20" aria-hidden="true" />
        </span>
        <span class="font-heading text-xl font-semibold text-fg">Proofly</span>
      </div>
      <p class="mt-2 text-muted-fg">Every receipt, return and warranty in one place.</p>

      <div class="mt-6 rounded-md border border-border bg-surface p-6">
        <h1 class="font-heading text-2xl font-semibold text-fg">{{ title }}</h1>
        <slot />
      </div>

      <p class="mt-4 text-center text-sm text-muted-fg"><slot name="footer" /></p>
    </div>
  </main>
</template>
