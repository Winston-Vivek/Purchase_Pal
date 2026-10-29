<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

const props = withDefaults(defineProps<{ message: string; duration?: number }>(), {
  duration: 4000,
});

const emit = defineEmits<{ dismiss: [] }>();

let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  timer = setTimeout(() => emit('dismiss'), props.duration);
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div
    role="status"
    class="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-fg"
  >
    <!-- role=status, not alert: a success is not an interruption. -->
    {{ message }}
  </div>
</template>
