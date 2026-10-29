<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ServiceRecordResponse } from '../api/types';
import BaseButton from './BaseButton.vue';
import BaseDialog from './BaseDialog.vue';
import BaseInput from './BaseInput.vue';

export interface ServiceDraft {
  serviceDate: string;
  description: string;
  provider: string | undefined;
  cost: number | undefined;
  notes: string | undefined;
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    /** §7 bounds: on or after the purchase, not in the future. */
    purchaseDate: string;
    today: string;
    record?: ServiceRecordResponse | null;
    errors?: Record<string, string>;
    saving?: boolean;
  }>(),
  { record: null, saving: false },
);

const emit = defineEmits<{ submit: [ServiceDraft]; cancel: [] }>();

const serviceDate = ref('');
const description = ref('');
const provider = ref('');
const cost = ref('');
const notes = ref('');

const isEdit = computed(() => props.record !== null);
const fields = computed(() => props.errors ?? {});

watch(
  () => [props.open, props.record] as const,
  ([open]) => {
    if (!open) return;
    const record = props.record;
    // Defaults to today: most visits are logged the day they happen.
    serviceDate.value = record?.serviceDate ?? props.today;
    description.value = record?.description ?? '';
    provider.value = record?.provider ?? '';
    cost.value = record?.cost === null || record?.cost === undefined ? '' : String(record.cost);
    notes.value = record?.notes ?? '';
  },
  { immediate: true },
);

function submit(): void {
  emit('submit', {
    serviceDate: serviceDate.value,
    description: description.value,
    provider: provider.value || undefined,
    cost: cost.value === '' ? undefined : Number(cost.value),
    notes: notes.value || undefined,
  });
}
</script>

<template>
  <BaseDialog
    :open="open"
    :title="isEdit ? 'Edit service record' : 'Add service record'"
    @cancel="emit('cancel')"
  >
    <form class="mt-4 flex flex-col gap-4" novalidate @submit.prevent="submit">
      <BaseInput
        id="serviceDate"
        v-model="serviceDate"
        label="Date of service"
        type="date"
        :error="fields.serviceDate"
        :min="purchaseDate"
        :max="today"
        required
      />

      <BaseInput
        id="description"
        v-model="description"
        label="What was done"
        :error="fields.description"
        required
      />
      <BaseInput id="provider" v-model="provider" label="Who did it (optional)" :error="fields.provider" />
      <BaseInput
        id="cost"
        v-model="cost"
        label="Cost (optional)"
        inputmode="decimal"
        :error="fields.cost"
      />
      <BaseInput id="notes" v-model="notes" label="Notes (optional)" :error="fields.notes" />

      <div class="mt-2 flex justify-end gap-3">
        <BaseButton variant="secondary" type="button" @click="emit('cancel')">Cancel</BaseButton>
        <BaseButton type="submit" :loading="saving" loading-label="Saving…">
          {{ isEdit ? 'Save changes' : 'Add record' }}
        </BaseButton>
      </div>
    </form>
  </BaseDialog>
</template>
