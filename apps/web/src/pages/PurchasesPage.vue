<script setup lang="ts">
import { X } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError, api } from '../api/client';
import { CATEGORIES, type Page, type PurchaseResponse } from '../api/types';
import AppShell from '../components/AppShell.vue';
import BaseButton from '../components/BaseButton.vue';
import EmptyState from '../components/EmptyState.vue';
import SkeletonBlock from '../components/SkeletonBlock.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatMoney } from '../lib/format';

const route = useRoute();
const router = useRouter();

/**
 * Filters live in the URL, not in component state, so a filtered list can be
 * refreshed, shared and linked to — which is exactly what the dashboard's
 * count cards do (state-url-for-ephemeral-filters).
 */
const ACCEPTED = ['q', 'category', 'returnStatus', 'warrantyStatus', 'sort', 'page', 'pageSize'];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  EXPIRING_SOON: 'Expiring soon',
  EXPIRED: 'Expired',
  NOT_SET: 'Not set',
};

const SORTS = [
  ['newest', 'Newest first'],
  ['deadline_asc', 'Nearest deadline'],
  ['price_desc', 'Price, high to low'],
  ['price_asc', 'Price, low to high'],
] as const;

const current = (key: string): string => {
  const value = route.query[key];
  return typeof value === 'string' ? value : '';
};

function queryString(): string {
  const params = new URLSearchParams();

  for (const key of ACCEPTED) {
    const value = current(key);
    if (value !== '') params.set(key, value);
  }

  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

/** Changing a filter resets to page 1: staying on page 3 of a narrower result
 *  shows an empty list that looks like "no matches". */
function go(changes: Record<string, string | undefined>): void {
  const next: Record<string, string> = {};

  for (const key of ACCEPTED) {
    const value = key in changes ? changes[key] : current(key);
    if (value !== undefined && value !== '') next[key] = value;
  }

  if (!('page' in changes)) delete next.page;

  void router.push({ query: next });
}

const items = ref<PurchaseResponse[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(true);
const error = ref<string | null>(null);

const searchText = ref(current('q'));
watch(() => current('q'), (value) => (searchText.value = value));

/** One chip per active filter, each removable on its own. */
const chips = computed(() => {
  const list: { key: string; label: string }[] = [];
  const q = current('q');
  const category = current('category');
  const returnStatus = current('returnStatus');
  const warrantyStatus = current('warrantyStatus');

  if (q) list.push({ key: 'q', label: `“${q}”` });
  if (category) {
    const match = CATEGORIES.find(([value]) => value === category);
    list.push({ key: 'category', label: match?.[1] ?? category });
  }
  if (returnStatus) {
    list.push({ key: 'returnStatus', label: `Return: ${STATUS_LABELS[returnStatus] ?? returnStatus}` });
  }
  if (warrantyStatus) {
    list.push({
      key: 'warrantyStatus',
      label: `Warranty: ${STATUS_LABELS[warrantyStatus] ?? warrantyStatus}`,
    });
  }

  return list;
});

const hasFilters = computed(() => chips.value.length > 0 || current('sort') !== '');

const showing = computed(() => {
  const first = (page.value - 1) * pageSize.value + 1;
  const last = Math.min(page.value * pageSize.value, total.value);
  return `Showing ${first}–${last} of ${total.value}`;
});

const lastPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const result = await api<Page<PurchaseResponse>>(`/purchases${queryString()}`);
    items.value = result.items;
    total.value = result.total;
    page.value = result.page;
    pageSize.value = result.pageSize;
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
      <p v-if="!loading && !error && total > 0" class="text-muted-fg tabular-nums">{{ showing }}</p>
    </div>

    <div class="mt-4 flex flex-col gap-3">
      <form
        data-testid="search-form"
        class="flex flex-wrap items-end gap-3"
        @submit.prevent="go({ q: searchText })"
      >
        <div class="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <label for="q" class="text-sm font-semibold text-fg">Search</label>
          <input
            id="q"
            v-model="searchText"
            type="search"
            placeholder="Product, seller or notes"
            class="min-h-11 rounded-sm border border-input bg-surface px-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="category" class="text-sm font-semibold text-fg">Category</label>
          <select
            id="category"
            :value="current('category')"
            class="min-h-11 rounded-sm border border-input bg-surface px-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            @change="go({ category: ($event.target as HTMLSelectElement).value })"
          >
            <option value="">All</option>
            <option v-for="[value, text] in CATEGORIES" :key="value" :value="value">{{ text }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="sort" class="text-sm font-semibold text-fg">Sort</label>
          <select
            id="sort"
            :value="current('sort') || 'newest'"
            class="min-h-11 rounded-sm border border-input bg-surface px-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            @change="go({ sort: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="[value, text] in SORTS" :key="value" :value="value">{{ text }}</option>
          </select>
        </div>

        <BaseButton type="submit" variant="secondary">Search</BaseButton>
      </form>

      <div v-if="hasFilters" data-testid="chips" class="flex flex-wrap items-center gap-2">
        <span
          v-for="chip in chips"
          :key="chip.key"
          class="inline-flex items-center gap-1 rounded-sm bg-subtle py-1 pl-3 text-sm font-semibold text-fg"
        >
          {{ chip.label }}
          <button
            type="button"
            class="flex size-8 cursor-pointer items-center justify-center rounded-sm text-muted-fg hover:bg-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            :aria-label="`Remove filter ${chip.label}`"
            @click="go({ [chip.key]: undefined })"
          >
            <X :size="14" aria-hidden="true" />
          </button>
        </span>

        <button
          data-testid="clear-all"
          type="button"
          class="min-h-11 cursor-pointer px-2 text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          @click="go({ q: undefined, category: undefined, returnStatus: undefined, warrantyStatus: undefined, sort: undefined })"
        >
          Clear all
        </button>
      </div>
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

      <!-- An empty RESULT is not an empty ACCOUNT. Telling someone with 57
           purchases that they have none is worse than unhelpful. -->
      <EmptyState
        v-else-if="items.length === 0 && hasFilters"
        message="No purchases match these filters"
        :detail="`Nothing found for ${chips.map((c) => c.label).join(' · ')}. Try removing one.`"
      />

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
                <StatusBadge kind="RETURN" :status="purchase.returnStatus" :days-left="purchase.returnDaysLeft" :date="purchase.returnDeadline" />
                <StatusBadge kind="WARRANTY" :status="purchase.warrantyStatus" :days-left="purchase.warrantyDaysLeft" :date="purchase.warrantyExpiry" />
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
              <tr v-for="purchase in items" :key="purchase.id" class="border-t border-border hover:bg-subtle">
                <td class="px-4 py-3">
                  <RouterLink
                    :to="`/purchases/${purchase.id}`"
                    class="cursor-pointer font-semibold text-fg underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                  >
                    {{ purchase.productName }}
                  </RouterLink>
                  <StatusBadge v-if="!purchase.hasReceipt" kind="RECEIPT" status="MISSING" class="mt-1 flex w-fit" />
                </td>
                <td class="px-4 py-3 text-muted-fg tabular-nums">{{ formatDate(purchase.purchaseDate) }}</td>
                <td class="px-4 py-3 text-fg tabular-nums">{{ formatMoney(purchase.price, purchase.currency) }}</td>
                <td class="px-4 py-3">
                  <StatusBadge kind="RETURN" :status="purchase.returnStatus" :days-left="purchase.returnDaysLeft" :date="purchase.returnDeadline" />
                </td>
                <td class="px-4 py-3">
                  <StatusBadge kind="WARRANTY" :status="purchase.warrantyStatus" :days-left="purchase.warrantyDaysLeft" :date="purchase.warrantyExpiry" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav
          v-if="lastPage > 1"
          data-testid="pagination"
          aria-label="Pages"
          class="mt-4 flex flex-wrap items-center justify-between gap-3"
        >
          <p class="text-sm text-muted-fg tabular-nums">{{ showing }}</p>
          <span class="flex gap-2">
            <BaseButton
              variant="secondary"
              :disabled="page <= 1"
              @click="go({ page: String(page - 1) })"
            >
              Previous
            </BaseButton>
            <BaseButton
              variant="secondary"
              :disabled="page >= lastPage"
              @click="go({ page: String(page + 1) })"
            >
              Next
            </BaseButton>
          </span>
        </nav>
      </template>
    </div>
  </AppShell>
</template>
