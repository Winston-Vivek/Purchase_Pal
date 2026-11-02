<script setup lang="ts">
import { AlertTriangle, CircleCheck, FileX, MinusCircle, XCircle } from '@lucide/vue';
import { computed } from 'vue';
import type { DeadlineStatus } from '../api/types';
import { formatDate, pluralDays } from '../lib/format';

type Kind = 'RETURN' | 'WARRANTY' | 'SERVICE' | 'RECEIPT';
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
  // A service that is merely scheduled is not good news the way a live
  // warranty is — it is a neutral fact until it comes close.
  if (props.kind === 'SERVICE' && props.status === 'ACTIVE') return 'none';
  if (props.status === 'ACTIVE') return 'ok';
  if (props.status === 'EXPIRING_SOON') return 'warn';
  if (props.status === 'EXPIRED') return 'bad';
  // CLOSED included: a decision the user already made needs no colour. A green
  // badge here would compete with the warranty beside it for attention.
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

  // BR-12. A service has its own words: "Expiring soon" on a service would
  // read as the warranty running out, and "overdue" is what a missed service
  // actually is.
  if (props.kind === 'SERVICE') {
    switch (props.status) {
      case 'ACTIVE':
        return `Service due in ${pluralDays(days)}`;
      case 'EXPIRING_SOON':
        return days === 0 ? 'Service due today' : `Service due in ${pluralDays(days)}`;
      case 'EXPIRED':
        return `Service overdue · was ${formatDate(props.date)}`;
      default:
        return 'No service due';
    }
  }

  switch (props.status) {
    // BR-11. Deliberately not "Return closed": that is what an EXPIRED window
    // already says, and the two mean opposite things — one ran out, the other
    // was decided.
    case 'CLOSED':
      return 'Keeping it';
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
