<script setup lang="ts">
import { AlertTriangle, CircleCheck, FileX, MinusCircle, XCircle } from '@lucide/vue';
import { computed } from 'vue';
import type { DeadlineStatus } from '../api/types';
import { formatDate, pluralDays } from '../lib/format';

type Kind = 'RETURN' | 'WARRANTY' | 'RECEIPT';
type Status = DeadlineStatus | 'MISSING';

const props = withDefaults(
  defineProps<{
    kind: Kind;
    status: Status;
    daysLeft?: number | null;
    date?: string | null;
  }>(),
  { daysLeft: null, date: null },
);

/**
 * Full class strings, never `bg-${tone}-bg`. Tailwind generates utilities by
 * scanning the source, so an interpolated class name produces no CSS at all.
 */
const TONES = {
  ok: 'bg-ok-bg text-ok-fg',
  warn: 'bg-warn-bg text-warn-fg',
  bad: 'bg-bad-bg text-bad-fg',
  none: 'bg-none-bg text-none-fg',
} as const;

const ICONS = {
  ok: CircleCheck,
  warn: AlertTriangle,
  bad: XCircle,
  none: MinusCircle,
  receipt: FileX,
} as const;

const tone = computed<keyof typeof TONES>(() => {
  if (props.kind === 'RECEIPT') return 'warn';
  if (props.status === 'ACTIVE') return 'ok';
  if (props.status === 'EXPIRING_SOON') return 'warn';
  if (props.status === 'EXPIRED') return 'bad';
  return 'none';
});

// A different shape per status, so the signal survives colour blindness and
// greyscale printing (ui-guide §3).
const icon = computed(() => (props.kind === 'RECEIPT' ? ICONS.receipt : ICONS[tone.value]));

/** The words say what happened. "Expiring" names a state; "Return closes in
 *  3 days" tells you what to do about it. */
const label = computed(() => {
  if (props.kind === 'RECEIPT') return 'Receipt missing';

  const isReturn = props.kind === 'RETURN';
  const days = props.daysLeft ?? 0;

  switch (props.status) {
    case 'ACTIVE':
      return isReturn
        ? `Return open · ${pluralDays(days)} left`
        : `Covered · ${pluralDays(days)} left`;
    case 'EXPIRING_SOON':
      if (days === 0) return isReturn ? 'Return closes today' : 'Warranty ends today';
      return isReturn
        ? `Return closes in ${pluralDays(days)}`
        : `Warranty ends in ${pluralDays(days)}`;
    case 'EXPIRED':
      return isReturn
        ? `Return closed ${formatDate(props.date)}`
        : `Warranty ended ${formatDate(props.date)}`;
    default:
      return isReturn ? 'No return window' : 'No warranty';
  }
});

// The last day is the one worth noticing.
const isLastDay = computed(() => props.status === 'EXPIRING_SOON' && props.daysLeft === 0);
</script>

<template>
  <span
    class="inline-flex max-w-full items-center gap-1.5 rounded-sm px-2 py-1 text-[13px] leading-[18px] whitespace-normal"
    :class="[TONES[tone], isLastDay ? 'font-bold' : 'font-semibold']"
  >
    <component :is="icon" :size="16" aria-hidden="true" class="shrink-0" />
    <span>{{ label }}</span>
  </span>
</template>
