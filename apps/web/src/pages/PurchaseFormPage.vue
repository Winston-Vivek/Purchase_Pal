<script setup lang="ts">
import { CalendarDays, ShieldCheck } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, api } from '../api/client';
import { CATEGORIES, type PurchaseResponse } from '../api/types';
import AppShell from '../components/AppShell.vue';
import BaseButton from '../components/BaseButton.vue';
import BaseInput from '../components/BaseInput.vue';
import ErrorSummary from '../components/ErrorSummary.vue';
import { daysFromToday, returnDeadline, warrantyExpiry } from '../lib/deadlines';
import { formatDate, pluralDays } from '../lib/format';

const route = useRoute();
const router = useRouter();

const purchaseId = computed(() => (route.params as Record<string, string>).purchaseId ?? null);
const isEdit = computed(() => purchaseId.value !== null);

const productName = ref('');
const category = ref<string>('ELECTRONICS');
const seller = ref('');
const price = ref('');
const purchaseDate = ref('');
const notes = ref('');

type ReturnMode = 'window' | 'exact' | 'none';
const returnMode = ref<ReturnMode>('window');
const returnWindowDays = ref('');
const manualDeadline = ref('');

const hasWarranty = ref(false);
const warrantyStartDate = ref('');

/**
 * Nearly every warranty starts the day you buy the thing, so typing the same
 * date twice is the common case. Ticked, the start follows the purchase date
 * — including when that date is corrected afterwards, which is the bit that
 * would otherwise go quietly wrong.
 */
const warrantyStartsOnPurchase = ref(true);

watch([purchaseDate, warrantyStartsOnPurchase, hasWarranty], () => {
  if (warrantyStartsOnPurchase.value) warrantyStartDate.value = purchaseDate.value;
});
const warrantyLength = ref('');
const warrantyUnit = ref<'months' | 'years'>('months');

const fields = ref<Record<string, string>>({});
const formError = ref<string | null>(null);
const saving = ref(false);

const warrantyMonths = computed(() => {
  const length = Number(warrantyLength.value);
  if (!warrantyLength.value || Number.isNaN(length)) return null;
  return warrantyUnit.value === 'years' ? length * 12 : length;
});

/**
 * The previews run BR-01 and BR-02 in the browser so the answer is visible
 * before saving (ui-guide §6). src/lib/deadlines.ts is pinned to the same
 * cases as the API's DatesService.
 */
const previewReturn = computed(() => {
  if (returnMode.value === 'none') return null;

  const deadline =
    returnMode.value === 'exact'
      ? returnDeadline(purchaseDate.value, null, manualDeadline.value)
      : returnDeadline(purchaseDate.value, Number(returnWindowDays.value), null);

  if (!deadline || (returnMode.value === 'window' && returnWindowDays.value === '')) return null;
  return { date: deadline, days: daysFromToday(deadline) };
});

const previewWarranty = computed(() => {
  if (!hasWarranty.value) return null;

  const expiry = warrantyExpiry(warrantyStartDate.value, warrantyMonths.value);
  if (!expiry) return null;
  return { date: expiry, days: daysFromToday(expiry) };
});

function relative(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'today';
  return days > 0 ? `in ${pluralDays(days)}` : `${pluralDays(Math.abs(days))} ago`;
}

onMounted(async () => {
  // Purchase date defaults to today: most things are logged the day they arrive.
  if (!isEdit.value) return;

  try {
    const purchase = await api<PurchaseResponse>(`/purchases/${purchaseId.value}`);
    productName.value = purchase.productName;
    category.value = purchase.category;
    seller.value = purchase.seller ?? '';
    price.value = String(purchase.price);
    purchaseDate.value = purchase.purchaseDate;
    notes.value = purchase.notes ?? '';

    if (purchase.returnWindowDays !== null) {
      returnMode.value = 'window';
      returnWindowDays.value = String(purchase.returnWindowDays);
    } else if (purchase.returnDeadline !== null) {
      returnMode.value = 'exact';
      manualDeadline.value = purchase.returnDeadline;
    } else {
      returnMode.value = 'none';
    }

    hasWarranty.value = purchase.warrantyMonths !== null;
    warrantyStartDate.value = purchase.warrantyStartDate ?? '';
    // Decided from what was actually saved, so loading never rewrites a start
    // date that was deliberately different — an appliance installed weeks
    // after it was bought.
    warrantyStartsOnPurchase.value =
      purchase.warrantyStartDate === null || purchase.warrantyStartDate === purchase.purchaseDate;
    warrantyLength.value = purchase.warrantyMonths === null ? '' : String(purchase.warrantyMonths);
  } catch (failure) {
    formError.value =
      failure instanceof ApiError ? failure.message : 'Could not load the purchase.';
  }
});

function payload(): Record<string, unknown> {
  return {
    productName: productName.value,
    category: category.value,
    seller: seller.value || undefined,
    price: Number(price.value),
    purchaseDate: purchaseDate.value,
    notes: notes.value || undefined,
    returnWindowDays:
      returnMode.value === 'window' && returnWindowDays.value !== ''
        ? Number(returnWindowDays.value)
        : undefined,
    returnDeadline:
      returnMode.value === 'exact' && manualDeadline.value ? manualDeadline.value : undefined,
    warrantyStartDate:
      hasWarranty.value && warrantyStartDate.value ? warrantyStartDate.value : undefined,
    warrantyMonths:
      hasWarranty.value && warrantyMonths.value !== null ? warrantyMonths.value : undefined,
  };
}

async function save(): Promise<void> {
  saving.value = true;
  fields.value = {};
  formError.value = null;

  try {
    const saved = await api<PurchaseResponse>(
      isEdit.value ? `/purchases/${purchaseId.value}` : '/purchases',
      { method: isEdit.value ? 'PATCH' : 'POST', body: payload() },
    );
    await router.push(`/purchases/${saved.id}`);
  } catch (failure) {
    // Nothing is cleared: every typed value stays in its ref, so a rejected
    // save never costs the user their form (ui-guide §6).
    if (failure instanceof ApiError) {
      fields.value = failure.fields ?? {};
      if (!failure.fields) formError.value = failure.message;
    } else {
      formError.value = 'Something went wrong. Please try again.';
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppShell>
    <!-- ui-guide §2: forms are capped at 640px. Centring the column keeps the
         page balanced on a wide monitor, where a left-hugging form left most
         of the screen empty. -->
    <div class="mx-auto max-w-[640px]">
      <h1 class="font-heading text-2xl font-semibold text-fg lg:text-[28px]">
        {{ isEdit ? 'Edit purchase' : 'Add purchase' }}
      </h1>
      <p class="mt-1 text-muted-fg">
        Only the product, price and purchase date are required. Add the rest now or later.
      </p>

      <form class="mt-6 flex flex-col gap-6" novalidate @submit.prevent="save">
        <ErrorSummary :errors="fields" />

        <p
          v-if="formError"
          role="alert"
          class="rounded-sm border border-danger bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg"
        >
          {{ formError }}
        </p>

        <fieldset class="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:p-6">
          <legend class="px-1 font-heading text-lg font-semibold text-fg">Product</legend>

          <BaseInput
            id="productName"
            v-model="productName"
            label="Product name"
            :error="fields.productName"
            required
          />

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="category" class="text-sm font-semibold text-fg">Category</label>
              <select
                id="category"
                v-model="category"
                class="min-h-11 rounded-sm border border-input bg-surface px-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                <option v-for="[value, text] in CATEGORIES" :key="value" :value="value">
                  {{ text }}
                </option>
              </select>
            </div>

            <BaseInput
              id="seller"
              v-model="seller"
              label="Seller (optional)"
              :error="fields.seller"
            />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <BaseInput
              id="price"
              v-model="price"
              label="Price"
              inputmode="decimal"
              hint="In rupees"
              :error="fields.price"
              required
            />
            <BaseInput
              id="purchaseDate"
              v-model="purchaseDate"
              label="Purchase date"
              type="date"
              :error="fields.purchaseDate"
              required
            />
          </div>
        </fieldset>

        <fieldset class="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:p-6">
          <legend class="px-1 font-heading text-lg font-semibold text-fg">Return</legend>

          <div
            role="radiogroup"
            aria-label="How the return window is set"
            class="flex flex-wrap gap-2"
          >
            <label
              v-for="mode in ['window', 'exact', 'none'] as const"
              :key="mode"
              class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 font-semibold"
              :class="
                returnMode === mode
                  ? 'border-primary bg-primary-tint text-primary'
                  : 'border-input text-fg'
              "
            >
              <input
                :id="`returnMode-${mode}`"
                v-model="returnMode"
                type="radio"
                :value="mode"
                class="size-4"
              />
              {{
                mode === 'window'
                  ? 'Window in days'
                  : mode === 'exact'
                    ? 'Exact last date'
                    : 'No return'
              }}
            </label>
          </div>

          <BaseInput
            v-if="returnMode === 'window'"
            id="returnWindowDays"
            v-model="returnWindowDays"
            label="Days to return"
            inputmode="numeric"
            hint="Days after the purchase date"
            :error="fields.returnWindowDays"
          />
          <BaseInput
            v-else-if="returnMode === 'exact'"
            id="returnDeadline"
            v-model="manualDeadline"
            label="Last day to return"
            type="date"
            :error="fields.returnDeadline"
          />

          <p
            v-if="previewReturn"
            class="flex items-center gap-2 rounded-sm bg-subtle px-3 py-2 text-fg"
          >
            <CalendarDays :size="18" aria-hidden="true" class="text-muted-fg" />
            <span>
              Return closes <strong>{{ formatDate(previewReturn.date) }}</strong> ·
              {{ relative(previewReturn.days) }}
            </span>
          </p>
        </fieldset>

        <fieldset class="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:p-6">
          <legend class="px-1 font-heading text-lg font-semibold text-fg">Warranty</legend>

          <label class="flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-fg">
            <input id="hasWarranty" v-model="hasWarranty" type="checkbox" class="size-4" />
            Has a warranty
          </label>

          <template v-if="hasWarranty">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5">
                <BaseInput
                  id="warrantyStartDate"
                  v-model="warrantyStartDate"
                  label="Warranty starts"
                  type="date"
                  :disabled="warrantyStartsOnPurchase"
                  :error="fields.warrantyStartDate"
                />
                <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-fg">
                  <input
                    id="warrantyStartsOnPurchase"
                    v-model="warrantyStartsOnPurchase"
                    type="checkbox"
                    class="size-4"
                  />
                  Starts on the purchase date
                </label>
              </div>
              <!-- self-start: the cell beside this one is taller because of its
                 hint, and without it the whole group sank to the bottom of the
                 row, putting "Length" out of line with "Warranty starts". -->
              <div class="flex items-end gap-2 self-start">
                <div class="flex-1">
                  <BaseInput
                    id="warrantyLength"
                    v-model="warrantyLength"
                    label="Length"
                    inputmode="numeric"
                    :error="fields.warrantyMonths"
                  />
                </div>
                <select
                  id="warrantyUnit"
                  v-model="warrantyUnit"
                  aria-label="Warranty length unit"
                  class="min-h-11 rounded-sm border border-input bg-surface px-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                >
                  <option value="months">months</option>
                  <option value="years">years</option>
                </select>
              </div>
            </div>

            <p
              v-if="previewWarranty"
              class="flex items-center gap-2 rounded-sm bg-ok-bg px-3 py-2 text-ok-fg"
            >
              <ShieldCheck :size="18" aria-hidden="true" />
              <span>
                Covered until <strong>{{ formatDate(previewWarranty.date) }}</strong> ·
                {{ previewWarranty.days === null ? '' : pluralDays(previewWarranty.days) }} from
                today
              </span>
            </p>
          </template>
        </fieldset>

        <div class="flex justify-end gap-3">
          <BaseButton variant="secondary" type="button" @click="router.push('/purchases')">
            Cancel
          </BaseButton>
          <BaseButton type="submit" :loading="saving" loading-label="Saving…">
            {{ isEdit ? 'Save changes' : 'Save purchase' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </AppShell>
</template>
