<script setup lang="ts">
import { RotateCcw, ShieldCheck } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import StatusBadge from './StatusBadge.vue';
import { formatDate } from '../lib/format';

const props = defineProps<{
  purchaseId: string;
  productName: string;
  kind: 'RETURN' | 'WARRANTY';
  date: string;
  daysLeft: number;
  hasReceipt: boolean;
  seller?: string | null;
}>();

const status = computed(() => (props.daysLeft < 0 ? 'EXPIRED' : 'EXPIRING_SOON'));

const detail = computed(() =>
  props.kind === 'RETURN'
    ? `Return${props.seller ? ` to ${props.seller}` : ''} by ${formatDate(props.date)}`
    : `Warranty covered until ${formatDate(props.date)}`,
);
</script>

<template>
  <!-- The whole row is one link (ui-guide §4): a small target inside a wide
       row is a miss waiting to happen, especially on a phone. -->
  <RouterLink
    :to="`/purchases/${purchaseId}`"
    class="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
  >
    <span class="flex min-w-0 items-center gap-3">
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-md bg-subtle text-muted-fg"
        aria-hidden="true"
      >
        <component :is="kind === 'RETURN' ? RotateCcw : ShieldCheck" :size="18" />
      </span>
      <span class="min-w-0">
        <span class="block truncate font-semibold text-fg">{{ productName }}</span>
        <span class="block truncate text-sm text-muted-fg">{{ detail }}</span>
      </span>
    </span>

    <span class="flex flex-wrap gap-2">
      <StatusBadge :kind="kind" :status="status" :days-left="daysLeft" :date="date" />
      <StatusBadge v-if="!hasReceipt" kind="RECEIPT" status="MISSING" />
    </span>
  </RouterLink>
</template>
