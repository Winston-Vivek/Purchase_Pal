<script setup lang="ts">
import { Download, Pencil, Plus, RotateCcw, ShieldCheck, Trash2, Wrench } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError, api } from '../api/client';
import {
  categoryLabel,
  type AttachmentResponse,
  type PurchaseDetail,
  type ServiceRecordResponse,
} from '../api/types';
import AppShell from '../components/AppShell.vue';
import BaseButton from '../components/BaseButton.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import ServiceDialog, { type ServiceDraft } from '../components/ServiceDialog.vue';
import ToastMessage from '../components/ToastMessage.vue';
import EmptyState from '../components/EmptyState.vue';
import FileDrop from '../components/FileDrop.vue';
import SkeletonBlock from '../components/SkeletonBlock.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { formatDate, formatFileSize, formatMoney } from '../lib/format';
import { todayIso } from '../lib/deadlines';

const MAX_RECEIPTS = 5;

const route = useRoute();
const router = useRouter();
const purchaseId = computed(() => (route.params as Record<string, string>).purchaseId ?? '');

/**
 * Where "back" goes.
 *
 * vue-router records the path you came from in history state. The link used
 * to be hard-coded to the list, so opening a purchase from the Dashboard and
 * pressing back dropped you on a screen you had never visited. Only the
 * Dashboard is treated as its own origin; anything else — a direct link, a
 * refresh, the edit form — belongs to the list.
 */
const back = computed(() => {
  const from = (window.history.state as { back?: unknown } | null)?.back;
  const fromDashboard = typeof from === 'string' && from.startsWith('/dashboard');

  return fromDashboard
    ? { to: '/dashboard', label: 'Dashboard' }
    : { to: '/purchases', label: 'My purchases' };
});

const purchase = ref<PurchaseDetail | null>(null);
const loading = ref(true);
const notFound = ref(false);
const loadError = ref<string | null>(null);
const uploadError = ref<string | null>(null);
const uploading = ref(false);

const attachments = computed<AttachmentResponse[]>(() => purchase.value?.attachments ?? []);
const services = computed<ServiceRecordResponse[]>(() => purchase.value?.serviceRecords ?? []);

const toast = ref<string | null>(null);

/** Which record the service dialog is editing, or null for a new one. */
const serviceDialogOpen = ref(false);
const editingService = ref<ServiceRecordResponse | null>(null);
const serviceErrors = ref<Record<string, string>>({});
const savingService = ref(false);

/** One confirmation at a time, so there is never a question about what the
 *  Delete button in the dialog applies to. */
type Pending =
  | { kind: 'purchase' }
  | { kind: 'attachment'; id: string; name: string }
  | { kind: 'service'; id: string; description: string };

const pending = ref<Pending | null>(null);

const confirmTitle = computed(() => {
  const p = pending.value;
  if (!p) return '';
  if (p.kind === 'purchase') return `Delete ${purchase.value?.productName}?`;
  if (p.kind === 'attachment') return `Delete ${p.name}?`;
  return `Delete "${p.description}"?`;
});

const confirmBody = computed(() => {
  const p = pending.value;
  if (p?.kind !== 'purchase') return 'You cannot undo this.';

  // ui-guide §7 and BR-08: say what goes with it, not just "are you sure".
  const parts = [
    `${attachments.value.length} ${attachments.value.length === 1 ? 'receipt' : 'receipts'}`,
    `${services.value.length} ${services.value.length === 1 ? 'service record' : 'service records'}`,
  ];
  return `This also deletes its ${parts.join(' and ')}. You cannot undo this.`;
});

function openServiceDialog(record: ServiceRecordResponse | null): void {
  editingService.value = record;
  serviceErrors.value = {};
  serviceDialogOpen.value = true;
}

async function saveService(draft: ServiceDraft): Promise<void> {
  savingService.value = true;
  serviceErrors.value = {};

  const editing = editingService.value;

  try {
    const saved = await api<ServiceRecordResponse>(
      editing ? `/services/${editing.id}` : `/purchases/${purchaseId.value}/services`,
      { method: editing ? 'PATCH' : 'POST', body: draft },
    );

    if (purchase.value) {
      const rest = services.value.filter((r) => r.id !== saved.id);
      // Newest first, the order the API lists them in (API-SVC-02).
      purchase.value.serviceRecords = [saved, ...rest].sort((a, b) =>
        b.serviceDate.localeCompare(a.serviceDate),
      );
    }

    serviceDialogOpen.value = false;
    toast.value = editing ? 'Service record updated' : 'Service record added';
  } catch (failure) {
    // The dialog stays open with what was typed; closing it would throw the
    // user's input away over a validation message.
    if (failure instanceof ApiError) {
      serviceErrors.value = failure.fields ?? { description: failure.message };
    } else {
      serviceErrors.value = { description: 'Could not save that record.' };
    }
  } finally {
    savingService.value = false;
  }
}

async function confirmDelete(): Promise<void> {
  const target = pending.value;
  if (!target) return;
  pending.value = null;

  try {
    if (target.kind === 'purchase') {
      await api(`/purchases/${purchaseId.value}`, { method: 'DELETE' });
      await router.push('/purchases');
      return;
    }

    if (target.kind === 'attachment') {
      await api(`/attachments/${target.id}`, { method: 'DELETE' });
      if (purchase.value) {
        purchase.value.attachments = attachments.value.filter((a) => a.id !== target.id);
        purchase.value.hasReceipt = purchase.value.attachments.length > 0;
      }
      toast.value = 'Receipt deleted';
      return;
    }

    await api(`/services/${target.id}`, { method: 'DELETE' });
    if (purchase.value) {
      purchase.value.serviceRecords = services.value.filter((r) => r.id !== target.id);
    }
    toast.value = 'Service record deleted';
  } catch (failure) {
    uploadError.value = failure instanceof ApiError ? failure.message : 'Could not delete that.';
  }
}

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

const closingReturn = ref(false);

/** BR-11. Only offered when there is a return to close: a purchase with no
 *  window has nothing to decide about. */
const canCloseReturn = computed(() => purchase.value?.returnDeadline !== null);

async function setReturnClosed(closed: boolean): Promise<void> {
  closingReturn.value = true;
  uploadError.value = null;

  try {
    // The server recomputes the status, so the response — not a local guess —
    // is what the page then shows.
    const updated = await api<PurchaseDetail>(`/purchases/${purchaseId.value}`, {
      method: 'PATCH',
      body: { returnClosed: closed },
    });
    if (purchase.value) Object.assign(purchase.value, updated);
    toast.value = closed ? 'Return closed — you are keeping it' : 'Return reopened';
  } catch (failure) {
    uploadError.value =
      failure instanceof ApiError ? failure.message : 'Could not change the return.';
  } finally {
    closingReturn.value = false;
  }
}

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
    uploadError.value =
      failure instanceof ApiError ? failure.message : 'Could not upload that file.';
  } finally {
    uploading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <AppShell>
    <RouterLink
      :to="back.to"
      class="inline-flex cursor-pointer items-center gap-1 font-semibold text-primary hover:underline"
    >
      ‹ {{ back.label }}
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
                {{ categoryLabel(purchase.category) }}
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
            <dd class="font-semibold text-fg tabular-nums">
              {{ formatDate(purchase.purchaseDate) }}
            </dd>
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
          <p v-else class="mt-4 text-muted-fg">No warranty was recorded for this purchase.</p>
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

          <!-- BR-11: the way to say "I have decided, stop counting this." -->
          <BaseButton
            v-if="canCloseReturn"
            variant="secondary"
            class="mt-4"
            :loading="closingReturn"
            loading-label="Saving…"
            @click="setReturnClosed(purchase.returnStatus !== 'CLOSED')"
          >
            {{ purchase.returnStatus === 'CLOSED' ? 'Reopen return' : 'Keeping it' }}
          </BaseButton>
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
            <span class="flex items-center gap-1">
              <a
                :href="`/api/v1/attachments/${attachment.id}`"
                class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 font-semibold text-primary hover:bg-primary-tint focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                <Download :size="18" aria-hidden="true" />
                Download
              </a>
              <button
                type="button"
                class="flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                @click="
                  pending = { kind: 'attachment', id: attachment.id, name: attachment.fileName }
                "
              >
                <Trash2 :size="18" aria-hidden="true" />
                <span class="sr-only">Delete receipt {{ attachment.fileName }}</span>
              </button>
            </span>
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

      <section
        data-testid="service-history"
        class="mt-6 rounded-md border border-border bg-surface p-4 lg:p-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-heading text-lg font-semibold text-fg">Service history</h2>
          <BaseButton variant="secondary" @click="openServiceDialog(null)">
            <Plus :size="18" aria-hidden="true" />
            Add service record
          </BaseButton>
        </div>

        <ul v-if="services.length > 0" class="mt-4 flex flex-col gap-4">
          <li v-for="record in services" :key="record.id" class="flex gap-3">
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
              <p class="mt-1 flex gap-2">
                <button
                  type="button"
                  class="min-h-11 cursor-pointer px-1 text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                  @click="openServiceDialog(record)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="min-h-11 cursor-pointer px-1 text-sm font-semibold text-danger hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                  @click="
                    pending = { kind: 'service', id: record.id, description: record.description }
                  "
                >
                  Remove
                </button>
              </p>
            </div>
          </li>
        </ul>
        <p v-else class="mt-3 text-muted-fg">No repairs or services logged yet.</p>
      </section>

      <!-- ui-guide §6 S4: the destructive action sits in its own zone at the
           bottom, not next to Edit where it can be hit by accident. -->
      <section
        class="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-danger bg-surface p-4 lg:p-6"
      >
        <div>
          <h2 class="font-heading text-lg font-semibold text-fg">Delete this purchase</h2>
          <p class="text-sm text-muted-fg">{{ confirmBody }}</p>
        </div>
        <BaseButton variant="danger" @click="pending = { kind: 'purchase' }">
          <Trash2 :size="18" aria-hidden="true" />
          Delete purchase
        </BaseButton>
      </section>

      <ServiceDialog
        :open="serviceDialogOpen"
        :purchase-date="purchase.purchaseDate"
        :today="todayIso()"
        :record="editingService"
        :errors="serviceErrors"
        :saving="savingService"
        @submit="saveService"
        @cancel="serviceDialogOpen = false"
      />

      <ConfirmDialog
        :open="pending !== null"
        :title="confirmTitle"
        :body="confirmBody"
        @confirm="confirmDelete"
        @cancel="pending = null"
      />

      <div v-if="toast" class="fixed right-4 bottom-20 z-50 lg:bottom-4">
        <ToastMessage :message="toast" @dismiss="toast = null" />
      </div>
    </template>
  </AppShell>
</template>
