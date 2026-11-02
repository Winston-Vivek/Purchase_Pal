<script setup lang="ts">
import { AlertTriangle, Package, RotateCcw, ShieldCheck } from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ApiError, api } from '../api/client';
import type { PurchaseResponse } from '../api/types';
import AppShell from '../components/AppShell.vue';
import BaseButton from '../components/BaseButton.vue';
import DeadlineRow from '../components/DeadlineRow.vue';
import EmptyState from '../components/EmptyState.vue';
import SkeletonBlock from '../components/SkeletonBlock.vue';
import { useAuthStore } from '../stores/auth';
import { formatDate, formatMoney, pluralDays } from '../lib/format';

interface DeadlineItem {
  purchaseId: string;
  productName: string;
  kind: 'RETURN' | 'WARRANTY';
  date: string;
  daysLeft: number;
  hasReceipt: boolean;
}

interface DashboardSummary {
  counts: {
    total: number;
    underWarranty: number;
    openReturns: number;
    needsAction: number;
    totalValue: number;
  };
  needsAction: DeadlineItem[];
  recentlyExpired: DeadlineItem[];
  recentPurchases: PurchaseResponse[];
}

const { user } = storeToRefs(useAuthStore());

const summary = ref<DashboardSummary | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const greeting = computed(() => {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `Good ${part}, ${user.value?.name.split(' ')[0] ?? 'there'}`;
});

const subtitle = computed(() => {
  const count = summary.value?.counts.needsAction ?? 0;
  const today = formatDate(new Date().toISOString().slice(0, 10));
  if (count === 0) return `${today} · nothing needs action`;
  return `${today} · ${count} ${count === 1 ? 'deadline' : 'deadlines'} need attention`;
});

/** ui-guide §3 gives the last day its own wording, and the count card has to
 *  agree with the badge beside it rather than saying "in 0 days". */
function soonestDetail(needsAction: number): string {
  if (needsAction === 0 || !summary.value) return 'Nothing closing soon';

  const days = summary.value.needsAction[0]?.daysLeft ?? 0;
  return days === 0 ? 'Soonest closes today' : `Soonest closes in ${pluralDays(days)}`;
}

/**
 * Each card links to a list that genuinely matches its number. "Under
 * warranty" is ACTIVE or EXPIRING_SOON, so the filter has to carry both — a
 * card reading 5 that opens a list of 4 is how people stop trusting counts.
 */
const cards = computed(() => {
  const counts = summary.value?.counts;
  if (!counts) return [];

  return [
    {
      label: 'Total purchases',
      value: String(counts.total),
      detail: `Worth ${formatMoney(counts.totalValue)}`,
      to: '/purchases',
      icon: Package,
      urgent: false,
    },
    {
      label: 'Under warranty',
      value: String(counts.underWarranty),
      detail: 'Still covered',
      to: '/purchases?warrantyStatus=ACTIVE,EXPIRING_SOON',
      icon: ShieldCheck,
      urgent: false,
    },
    {
      label: 'Returns open',
      value: String(counts.openReturns),
      detail: 'Can still be sent back',
      to: '/purchases?returnStatus=ACTIVE,EXPIRING_SOON',
      icon: RotateCcw,
      urgent: false,
    },
    {
      label: 'Need action',
      value: String(counts.needsAction),
      detail: soonestDetail(counts.needsAction),
      to: '#needs-action',
      icon: AlertTriangle,
      urgent: counts.needsAction > 0,
    },
  ];
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    summary.value = await api<DashboardSummary>('/dashboard');
  } catch (failure) {
    error.value = failure instanceof ApiError ? failure.message : 'Something went wrong.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <AppShell>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-semibold text-fg lg:text-[28px]">{{ greeting }}</h1>
        <p v-if="!loading && !error" class="mt-1 text-muted-fg">{{ subtitle }}</p>
      </div>
      <RouterLink
        to="/purchases"
        class="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-input bg-surface px-4 font-semibold text-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      >
        View all purchases
      </RouterLink>
    </div>

    <SkeletonBlock v-if="loading" :lines="8" class="mt-6" />

    <div
      v-else-if="error"
      class="mt-6 flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-6"
    >
      <p role="alert" class="font-semibold text-fg">{{ error }}</p>
      <BaseButton variant="secondary" @click="load">Try again</BaseButton>
    </div>

    <template v-else-if="summary">
      <EmptyState
        v-if="summary.counts.total === 0"
        class="mt-6"
        message="Add your first purchase"
        detail="Record what you buy and Purchase Tracker keeps the receipt, the return window and the warranty together."
      >
        <template #action>
          <RouterLink
            to="/purchases/new"
            class="inline-flex min-h-11 cursor-pointer items-center rounded-md bg-primary px-4 font-semibold text-white hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden"
          >
            Add purchase
          </RouterLink>
        </template>
      </EmptyState>

      <template v-else>
        <div data-testid="counts" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RouterLink
            v-for="card in cards"
            :key="card.label"
            :to="card.to"
            class="flex cursor-pointer flex-col gap-1 rounded-md border bg-surface p-4 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            :class="card.urgent ? 'border-warn-fg bg-warn-bg' : 'border-border'"
          >
            <span class="flex items-center gap-2 text-sm font-semibold text-muted-fg">
              <component :is="card.icon" :size="18" aria-hidden="true" />
              {{ card.label }}
            </span>
            <span class="font-heading text-[28px] leading-9 font-semibold text-fg tabular-nums">
              {{ card.value }}
            </span>
            <span class="text-sm text-muted-fg">{{ card.detail }}</span>
          </RouterLink>
        </div>

        <section
          v-if="summary.needsAction.length > 0"
          id="needs-action"
          data-testid="needs-action"
          class="mt-6 rounded-md border border-border bg-surface"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
            <h2 class="font-heading text-lg font-semibold text-fg">Needs action</h2>
            <p class="text-sm text-muted-fg">
              Soonest first · warns {{ user?.returnAlertDays }} days before a return,
              {{ user?.warrantyAlertDays }} before a warranty
            </p>
          </div>
          <ul class="divide-y divide-border border-t border-border">
            <!-- The API already sorted these (API-DASH-02). Sorting again here
                 would be a second opinion that can disagree with it. -->
            <li v-for="item in summary.needsAction" :key="`${item.purchaseId}-${item.kind}`">
              <DeadlineRow v-bind="item" />
            </li>
          </ul>
        </section>

        <div class="mt-6 grid gap-4 lg:grid-cols-2">
          <section
            v-if="summary.recentlyExpired.length > 0"
            data-testid="recently-expired"
            class="rounded-md border border-border bg-surface"
          >
            <div class="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <h2 class="font-heading text-lg font-semibold text-fg">Recently expired</h2>
              <p class="text-sm text-muted-fg">Last 30 days</p>
            </div>
            <ul class="divide-y divide-border border-t border-border">
              <li v-for="item in summary.recentlyExpired" :key="`${item.purchaseId}-${item.kind}`">
                <DeadlineRow v-bind="item" />
              </li>
            </ul>
          </section>

          <section data-testid="recent-purchases" class="rounded-md border border-border bg-surface">
            <div class="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <h2 class="font-heading text-lg font-semibold text-fg">Recent purchases</h2>
              <RouterLink
                to="/purchases"
                class="cursor-pointer text-sm font-semibold text-primary underline"
              >
                View all
              </RouterLink>
            </div>
            <ul class="divide-y divide-border border-t border-border">
              <li v-for="purchase in summary.recentPurchases" :key="purchase.id">
                <RouterLink
                  :to="`/purchases/${purchase.id}`"
                  class="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                >
                  <span class="min-w-0">
                    <span class="block truncate font-semibold text-fg">{{ purchase.productName }}</span>
                    <span class="block truncate text-sm text-muted-fg">
                      <template v-if="purchase.seller">{{ purchase.seller }} · </template>
                      {{ formatDate(purchase.purchaseDate) }}
                    </span>
                  </span>
                  <span class="font-semibold text-fg tabular-nums">
                    {{ formatMoney(purchase.price, purchase.currency) }}
                  </span>
                </RouterLink>
              </li>
            </ul>
          </section>
        </div>
      </template>
    </template>
  </AppShell>
</template>
