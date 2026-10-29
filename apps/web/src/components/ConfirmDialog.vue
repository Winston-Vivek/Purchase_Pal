<script setup lang="ts">
import BaseDialog from './BaseDialog.vue';
import BaseButton from './BaseButton.vue';

withDefaults(
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
</script>

<template>
  <BaseDialog :open="open" :title="title" @cancel="emit('cancel')">
    <!-- ui-guide §7: name the thing AND what goes with it. -->
    <p v-if="body" class="mt-2 text-muted-fg">{{ body }}</p>

    <div class="mt-6 flex justify-end gap-3">
      <BaseButton variant="secondary" @click="emit('cancel')">{{ cancelLabel }}</BaseButton>
      <BaseButton variant="danger" @click="emit('confirm')">{{ confirmLabel }}</BaseButton>
    </div>
  </BaseDialog>
</template>
