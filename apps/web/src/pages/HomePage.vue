<script setup lang="ts">
import { CircleCheck } from '@lucide/vue';
</script>

<template>
  <main class="min-h-dvh bg-bg px-4 py-16">
    <div class="mx-auto max-w-[640px]">
      <h1 class="font-heading text-2xl font-semibold text-fg lg:text-[28px]">Proofly</h1>
      <p class="mt-2 text-muted-fg">Every receipt, return and warranty in one place.</p>

      <!-- Proves the token pipeline end to end: a status tint, an icon and
           text together, exactly as ui-guide §3 requires. -->
      <p
        class="mt-6 inline-flex items-center gap-2 rounded-sm bg-ok-bg px-3 py-1.5 text-sm font-semibold text-ok-fg"
      >
        <CircleCheck :size="20" aria-hidden="true" />
        Frontend scaffold ready
      </p>
    </div>
  </main>
</template>
