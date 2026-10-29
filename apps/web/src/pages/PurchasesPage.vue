<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ApiError, api } from '../api/client';
import type { Page, PurchaseResponse } from '../api/types';
import AppShell from '../components/AppShell.vue';
import BaseButton from '../components/BaseButton.vue';
import EmptyState from '../components/EmptyState.vue';
import SkeletonBlock from '../components/SkeletonBlock.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatMoney } from '../lib/format';

const route = useRoute();

/**
 * Filters live in the URL, not in component state, so a filtered list can be
 * refreshed, shared and linked to — which is exactly what the dashboard's
 * count cards do (vue-pinia-best-practices, state-url-for-ephemeral-filters).
 */
const ACCEPTED = ['q', 'category', 'returnStatus', 'warrantyStatus', 'sort', 'page', 'pageSize'];

function queryString(): string {
  const params = new URLSearchParams();

  for (const key of ACCEPTED) {
    const value = route.query[key];
    if (typeof value === 'string' && value !== '') params.set(key, value);
  }

  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

const items = ref<PurchaseResponse[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const page = await api<Page<PurchaseResponse>>(`/purchases${queryString()}`);
    items.value = page.items;
    total.value = page.total;
  } catch (failure) {
    // An error is not an empty list. Showing "no purchases yet" here would
    // tell the user they own nothing (ui-guide §7).
    error.value = failure instanceof ApiError ? failure.message : 'Something went wrong.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

// The route component is reused when only the query changes, so a new filter
// has to be watched for rather than relying on a remount
// (vue-router-best-practices).
watch(() => route.query, load, { deep: true });
</script>

<template>
  <AppShell>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-heading text-2xl font-semibold text-fg lg:text-[28px]">My purchases</h1>
      <p v-if="!loading && !error && total > 0" class="text-muted-fg tabular-nums">
        {{ total }} {{ total === 1 ? 'purchase' : 'purchases' }}
      </p>
    </div>

    <div class="mt-6">
      <SkeletonBlock v-if="loading" :lines="6" />

      <div
        v-else-if="error"
        class="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-6"
      >
        <p role="alert" class="font-semibold text-fg">{{ error }}</p>
        <BaseButton variant="secondary" @click="load">Try again</BaseButton>
      </div>

      <EmptyState
        v-else-if="items.length === 0"
        message="No purchases yet"
        detail="Record what you buy and Proofly keeps the receipt, the return window and the warranty together."
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
        <!-- Cards below 768px, table above: the same data, laid out for the
             width (ui-guide §6 S3). -->
        <ul class="flex flex-col gap-3 md:hidden">
          <li v-for="purchase in items" :key="purchase.id">
            <RouterLink
              :to="`/purchases/${purchase.id}`"
              class="flex cursor-pointer flex-col gap-2 rounded-md border border-border bg-surface p-4 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              <span class="font-semibold text-fg">{{ purchase.productName }}</span>
              <span class="flex flex-wrap items-center gap-x-3 text-sm text-muted-fg">
                <span class="tabular-nums">{{ formatDate(purchase.purchaseDate) }}</span>
                <span class="tabular-nums">{{ formatMoney(purchase.price, purchase.currency) }}</span>
              </span>
              <span class="flex flex-wrap gap-2">
                <StatusBadge
                  kind="RETURN"
                  :status="purchase.returnStatus"
                  :days-left="purchase.returnDaysLeft"
                  :date="purchase.returnDeadline"
                />
                <StatusBadge
                  kind="WARRANTY"
                  :status="purchase.warrantyStatus"
                  :days-left="purchase.warrantyDaysLeft"
                  :date="purchase.warrantyExpiry"
                />
                <StatusBadge v-if="!purchase.hasReceipt" kind="RECEIPT" status="MISSING" />
              </span>
            </RouterLink>
          </li>
        </ul>

        <div class="hidden overflow-hidden rounded-md border border-border bg-surface md:block">
          <table class="w-full text-left">
            <thead class="bg-subtle text-sm text-muted-fg">
              <tr>
                <th scope="col" class="px-4 py-3 font-semibold">Product</th>
                <th scope="col" class="px-4 py-3 font-semibold">Purchased</th>
                <th scope="col" class="px-4 py-3 font-semibold">Price</th>
                <th scope="col" class="px-4 py-3 font-semibold">Return</th>
                <th scope="col" class="px-4 py-3 font-semibold">Warranty</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="purchase in items"
                :key="purchase.id"
                class="border-t border-border hover:bg-subtle"
              >
                <td class="px-4 py-3">
                  <RouterLink
                    :to="`/purchases/${purchase.id}`"
                    class="cursor-pointer font-semibold text-fg underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                  >
                    {{ purchase.productName }}
                  </RouterLink>
                  <StatusBadge
                    v-if="!purchase.hasReceipt"
                    kind="RECEIPT"
                    status="MISSING"
                    class="mt-1 ml-0 flex w-fit"
                  />
                </td>
                <td class="px-4 py-3 text-muted-fg tabular-nums">
                  {{ formatDate(purchase.purchaseDate) }}
                </td>
                <td class="px-4 py-3 text-fg tabular-nums">
                  {{ formatMoney(purchase.price, purchase.currency) }}
                </td>
                <td class="px-4 py-3">
                  <StatusBadge
                    kind="RETURN"
                    :status="purchase.returnStatus"
                    :days-left="purchase.returnDaysLeft"
                    :date="purchase.returnDeadline"
                  />
                </td>
                <td class="px-4 py-3">
                  <StatusBadge
                    kind="WARRANTY"
                    :status="purchase.warrantyStatus"
                    :days-left="purchase.warrantyDaysLeft"
                    :date="purchase.warrantyExpiry"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </AppShell>
</template>
