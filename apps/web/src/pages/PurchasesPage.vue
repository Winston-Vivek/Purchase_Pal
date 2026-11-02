<script setup lang="ts">
import { Eye, Pencil, Trash2, X } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError, api } from '../api/client';
import { CATEGORIES, type Page, type PurchaseResponse } from '../api/types';
import AppShell from '../components/AppShell.vue';
import BaseButton from '../components/BaseButton.vue';
import EmptyState from '../components/EmptyState.vue';
import SkeletonBlock from '../components/SkeletonBlock.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import RowMenu from '../components/RowMenu.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatMoney } from '../lib/format';
import { serviceSummary } from '../lib/service-column';

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

/**
 * The dashboard links here with two statuses at once ("ACTIVE,EXPIRING_SOON"
 * is what "Open returns" means), so a chip has to label every value it was
 * given. Looking the whole string up as one key missed, and showed the raw
 * column values back to the user.
 */
function statusLabel(value: string): string {
  return value
    .split(',')
    .map((one) => STATUS_LABELS[one] ?? one)
    .join(' or ');
}

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
watch(
  () => current('q'),
  (value) => (searchText.value = value),
);

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
    list.push({ key: 'returnStatus', label: `Return: ${statusLabel(returnStatus)}` });
  }
  if (warrantyStatus) {
    list.push({
      key: 'warrantyStatus',
      label: `Warranty: ${statusLabel(warrantyStatus)}`,
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

/**
 * Opening a purchase from anywhere in its row.
 *
 * The product name stays a real link — that is the keyboard and
 * screen-reader path, and the one that supports open-in-new-tab. This is the
 * mouse convenience on top, so it must ignore clicks that belong to the
 * controls sitting inside the row.
 */
function openRow(event: MouseEvent, id: string): void {
  const target = event.target as HTMLElement | null;
  if (target?.closest('a, button, [role="menu"]')) return;

  void router.push(`/purchases/${id}`);
}

const pendingDelete = ref<PurchaseResponse | null>(null);
const deleteError = ref<string | null>(null);

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value;
  if (!target) return;

  pendingDelete.value = null;
  deleteError.value = null;

  try {
    await api(`/purchases/${target.id}`, { method: 'DELETE' });
    // Reloaded rather than spliced locally: the page, the total and the
    // paging all have to agree, and the server is what knows.
    await load();
  } catch (failure) {
    deleteError.value =
      failure instanceof ApiError ? failure.message : 'Could not delete that purchase.';
  }
}

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
            <option v-for="[value, text] in CATEGORIES" :key="value" :value="value">
              {{ text }}
            </option>
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
          @click="
            go({
              q: undefined,
              category: undefined,
              returnStatus: undefined,
              warrantyStatus: undefined,
              sort: undefined,
            })
          "
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
        <ul class="flex flex-col gap-3 md:hidden">
          <li v-for="purchase in items" :key="purchase.id">
            <RouterLink
              :to="`/purchases/${purchase.id}`"
              class="flex cursor-pointer flex-col gap-2 rounded-md border border-border bg-surface p-4 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              <span class="font-semibold text-fg">{{ purchase.productName }}</span>
              <span class="flex flex-wrap items-center gap-x-3 text-sm text-muted-fg">
                <span class="tabular-nums">{{ formatDate(purchase.purchaseDate) }}</span>
                <span class="tabular-nums">{{
                  formatMoney(purchase.price, purchase.currency)
                }}</span>
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
                <!-- Hidden below xl: six columns plus actions is more than a
                     1024px content area holds without squeezing the name. -->
                <th scope="col" class="hidden px-4 py-3 font-semibold xl:table-cell">Service</th>
                <th scope="col" class="px-4 py-3 font-semibold">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="purchase in items"
                :key="purchase.id"
                class="cursor-pointer border-t border-border hover:bg-subtle"
                @click="openRow($event, purchase.id)"
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
                    class="mt-1 flex w-fit"
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
                <td class="hidden px-4 py-3 xl:table-cell">
                  <StatusBadge
                    v-if="serviceSummary(purchase).kind === 'UPCOMING'"
                    kind="SERVICE"
                    :status="purchase.serviceStatus"
                    :days-left="purchase.serviceDaysLeft"
                    :date="purchase.nextServiceDate"
                  />
                  <span
                    v-else-if="serviceSummary(purchase).kind === 'LAST'"
                    class="text-sm text-muted-fg tabular-nums"
                  >
                    Serviced {{ formatDate(purchase.lastServiceDate) }}
                  </span>
                  <span v-else class="text-sm text-muted-fg">No service</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <RowMenu :label="`Actions for ${purchase.productName}`" class="ml-auto w-fit">
                    <RouterLink
                      :to="`/purchases/${purchase.id}`"
                      role="menuitem"
                      class="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold text-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                    >
                      <Eye :size="16" aria-hidden="true" />
                      View
                    </RouterLink>
                    <RouterLink
                      :to="`/purchases/${purchase.id}/edit`"
                      role="menuitem"
                      class="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold text-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                    >
                      <Pencil :size="16" aria-hidden="true" />
                      Edit
                    </RouterLink>
                    <button
                      type="button"
                      role="menuitem"
                      class="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-left font-semibold text-danger hover:bg-bad-bg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                      @click="pendingDelete = purchase"
                    >
                      <Trash2 :size="16" aria-hidden="true" />
                      Delete
                    </button>
                  </RowMenu>
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

    <ConfirmDialog
      :open="pendingDelete !== null"
      :title="`Delete ${pendingDelete?.productName ?? 'this purchase'}?`"
      body="Its receipts and service history go with it. You cannot undo this."
      confirm-label="Delete purchase"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />

    <p v-if="deleteError" role="alert" class="mt-4 font-semibold text-danger">
      {{ deleteError }}
    </p>
  </AppShell>
</template>
