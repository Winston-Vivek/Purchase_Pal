<script setup lang="ts">
import { Download, Pencil, RotateCcw, ShieldCheck, Wrench } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ApiError, api } from '../api/client';
import type { AttachmentResponse, PurchaseDetail } from '../api/types';
import AppShell from '../components/AppShell.vue';
import EmptyState from '../components/EmptyState.vue';
import FileDrop from '../components/FileDrop.vue';
import SkeletonBlock from '../components/SkeletonBlock.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatFileSize, formatMoney } from '../lib/format';

const MAX_RECEIPTS = 5;

const route = useRoute();
const purchaseId = computed(() => (route.params as Record<string, string>).purchaseId ?? '');

const purchase = ref<PurchaseDetail | null>(null);
const loading = ref(true);
const notFound = ref(false);
const loadError = ref<string | null>(null);
const uploadError = ref<string | null>(null);
const uploading = ref(false);

const attachments = computed<AttachmentResponse[]>(() => purchase.value?.attachments ?? []);

const serviceTotal = computed(() =>
  (purchase.value?.serviceRecords ?? []).reduce((sum, record) => sum + (record.cost ?? 0), 0),
);

/** ui-guide §6 S4: the panel says how the date was reached, not just what it
 *  is, so it can be checked against the card in the box. */
const warrantyRule = computed(() => {
  const p = purchase.value;
  if (!p?.warrantyMonths || !p.warrantyStartDate) return null;
  // Stated in months, the way BR-01 computes it and the way the user entered
  // it — "1 year from…" hides which rule produced the date.
  const months = `${p.warrantyMonths} ${p.warrantyMonths === 1 ? 'month' : 'months'}`;
  return `${months} from ${formatDate(p.warrantyStartDate)}. The last day is still covered.`;
});

const returnRule = computed(() => {
  const p = purchase.value;
  if (!p) return null;
  if (p.returnWindowDays !== null) {
    return `${p.returnWindowDays}-day window from ${formatDate(p.purchaseDate)}`;
  }
  if (p.returnDeadline !== null) return 'Entered manually';
  return null;
});

async function load(): Promise<void> {
  loading.value = true;
  notFound.value = false;
  loadError.value = null;

  try {
    purchase.value = await api<PurchaseDetail>(`/purchases/${purchaseId.value}`);
  } catch (failure) {
    // BR-09 returns 404 for someone else's purchase so its existence stays
    // hidden. Saying "not allowed" here would give that away.
    if (failure instanceof ApiError && failure.status === 404) notFound.value = true;
    else loadError.value = failure instanceof ApiError ? failure.message : 'Something went wrong.';
  } finally {
    loading.value = false;
  }
}

async function upload(file: File): Promise<void> {
  uploadError.value = null;
  uploading.value = true;

  const body = new FormData();
  body.append('file', file);

  try {
    // FormData, never JSON: stringifying it would destroy the multipart
    // boundary and fail in a way that looks like a server problem.
    const created = await api<AttachmentResponse>(`/purchases/${purchaseId.value}/attachments`, {
      method: 'POST',
      body,
    });

    if (purchase.value) {
      purchase.value.attachments = [...attachments.value, created];
      purchase.value.hasReceipt = true;
    }
  } catch (failure) {
    // Nothing is added, so the count and the banner stay where they were.
    uploadError.value = failure instanceof ApiError ? failure.message : 'Could not upload that file.';
  } finally {
    uploading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <AppShell>
    <RouterLink
      to="/purchases"
      class="inline-flex cursor-pointer items-center gap-1 font-semibold text-primary hover:underline"
    >
      ‹ My purchases
    </RouterLink>

    <SkeletonBlock v-if="loading" :lines="8" class="mt-6" />

    <EmptyState
      v-else-if="notFound"
      class="mt-6"
      message="Purchase not found"
      detail="It may have been deleted, or the link may be wrong."
    >
      <template #action>
        <RouterLink
          to="/purchases"
          class="inline-flex min-h-11 cursor-pointer items-center rounded-md bg-primary px-4 font-semibold text-white hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden"
        >
          Back to My purchases
        </RouterLink>
      </template>
    </EmptyState>

    <p v-else-if="loadError" role="alert" class="mt-6 font-semibold text-danger">{{ loadError }}</p>

    <template v-else-if="purchase">
      <section class="mt-4 rounded-md border border-border bg-surface p-4 lg:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="font-heading text-2xl font-semibold text-fg lg:text-[28px]">
              {{ purchase.productName }}
            </h1>
            <p class="mt-1 flex flex-wrap items-center gap-x-3 text-muted-fg">
              <span class="rounded-sm bg-subtle px-2 py-0.5 text-sm font-semibold text-fg">
                {{ purchase.category }}
              </span>
              <span v-if="purchase.seller">Bought from {{ purchase.seller }}</span>
            </p>
          </div>
          <RouterLink
            :to="`/purchases/${purchase.id}/edit`"
            class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input bg-surface px-4 font-semibold text-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <Pencil :size="18" aria-hidden="true" />
            Edit
          </RouterLink>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
          <div>
            <dt class="text-sm text-muted-fg">Price paid</dt>
            <dd class="font-semibold text-fg tabular-nums">
              {{ formatMoney(purchase.price, purchase.currency) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted-fg">Purchased</dt>
            <dd class="font-semibold text-fg tabular-nums">{{ formatDate(purchase.purchaseDate) }}</dd>
          </div>
          <div>
            <dt class="text-sm text-muted-fg">Receipts</dt>
            <dd class="font-semibold text-fg tabular-nums">
              {{ attachments.length }} {{ attachments.length === 1 ? 'file' : 'files' }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted-fg">Spent on service</dt>
            <dd class="font-semibold text-fg tabular-nums">
              {{ formatMoney(serviceTotal, purchase.currency) }}
            </dd>
          </div>
        </dl>
      </section>

      <div class="mt-6 grid gap-4 lg:grid-cols-2">
        <section class="rounded-md border border-border bg-surface p-4 lg:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-heading text-lg font-semibold text-fg">
              <ShieldCheck :size="20" aria-hidden="true" />
              Warranty
            </h2>
            <StatusBadge
              kind="WARRANTY"
              :status="purchase.warrantyStatus"
              :days-left="purchase.warrantyDaysLeft"
              :date="purchase.warrantyExpiry"
            />
          </div>

          <template v-if="purchase.warrantyExpiry">
            <p class="mt-4 text-sm text-muted-fg">Covered until</p>
            <p class="font-heading text-2xl font-semibold text-fg tabular-nums">
              {{ formatDate(purchase.warrantyExpiry) }}
            </p>
            <p class="mt-3 text-sm text-muted-fg">{{ warrantyRule }}</p>
          </template>
          <p v-else class="mt-4 text-muted-fg">
            No warranty was recorded for this purchase.
          </p>
        </section>

        <section class="rounded-md border border-border bg-surface p-4 lg:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 font-heading text-lg font-semibold text-fg">
              <RotateCcw :size="20" aria-hidden="true" />
              Return
            </h2>
            <StatusBadge
              kind="RETURN"
              :status="purchase.returnStatus"
              :days-left="purchase.returnDaysLeft"
              :date="purchase.returnDeadline"
            />
          </div>

          <template v-if="purchase.returnDeadline">
            <p class="mt-4 text-sm text-muted-fg">Return closes</p>
            <p class="font-heading text-2xl font-semibold text-fg tabular-nums">
              {{ formatDate(purchase.returnDeadline) }}
            </p>
            <p class="mt-3 text-sm text-muted-fg">{{ returnRule }}</p>
          </template>
          <p v-else class="mt-4 text-muted-fg">
            No return window was entered for this purchase, so no return deadline is tracked.
          </p>
        </section>
      </div>

      <section class="mt-6 rounded-md border border-border bg-surface p-4 lg:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-heading text-lg font-semibold text-fg">
            Receipts
            <span class="text-base font-normal text-muted-fg tabular-nums">
              {{ attachments.length }} of {{ MAX_RECEIPTS }}
            </span>
          </h2>
          <StatusBadge v-if="attachments.length === 0" kind="RECEIPT" status="MISSING" />
        </div>

        <ul v-if="attachments.length > 0" class="mt-4 flex flex-col divide-y divide-border">
          <li
            v-for="attachment in attachments"
            :key="attachment.id"
            class="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <span class="min-w-0">
              <span class="block truncate font-semibold text-fg">{{ attachment.fileName }}</span>
              <span class="block text-sm text-muted-fg">
                {{ formatFileSize(attachment.fileSize) }} · added
                {{ formatDate(attachment.uploadedAt.slice(0, 10)) }}
              </span>
            </span>
            <!-- A plain link: the browser streams it and the cookie goes with
                 it, so the file never passes through JavaScript. -->
            <a
              :href="`/api/v1/attachments/${attachment.id}`"
              class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 font-semibold text-primary hover:bg-primary-tint focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            >
              <Download :size="18" aria-hidden="true" />
              Download
            </a>
          </li>
        </ul>

        <div v-if="attachments.length < MAX_RECEIPTS" class="mt-4">
          <FileDrop @select="upload" />
        </div>

        <p v-if="uploadError" role="alert" class="mt-3 text-sm font-semibold text-danger">
          {{ uploadError }}
        </p>
        <p v-if="uploading" class="mt-3 text-sm text-muted-fg">Uploading…</p>
      </section>

      <section class="mt-6 rounded-md border border-border bg-surface p-4 lg:p-6">
        <h2 class="font-heading text-lg font-semibold text-fg">Service history</h2>

        <ul v-if="purchase.serviceRecords.length > 0" class="mt-4 flex flex-col gap-4">
          <li v-for="record in purchase.serviceRecords" :key="record.id" class="flex gap-3">
            <Wrench :size="20" aria-hidden="true" class="mt-1 shrink-0 text-muted-fg" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <span class="font-semibold text-fg">{{ record.description }}</span>
                <span v-if="record.cost !== null" class="text-fg tabular-nums">
                  {{ formatMoney(record.cost, purchase.currency) }}
                </span>
              </div>
              <p class="text-sm text-muted-fg">
                {{ formatDate(record.serviceDate) }}
                <template v-if="record.provider"> · {{ record.provider }}</template>
              </p>
            </div>
          </li>
        </ul>
        <p v-else class="mt-3 text-muted-fg">No repairs or services logged yet.</p>
      </section>
    </template>
  </AppShell>
</template>
