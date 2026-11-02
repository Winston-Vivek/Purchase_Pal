<script setup lang="ts">
import { LogOut } from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError, api } from '../api/client';
import AppShell from '../components/AppShell.vue';
import BaseButton from '../components/BaseButton.vue';
import BaseInput from '../components/BaseInput.vue';
import ToastMessage from '../components/ToastMessage.vue';
import { pluralDays } from '../lib/format';
import { useAuthStore } from '../stores/auth';

/** requirements §7. Each window has its own range. */
const RANGES = {
  warrantyAlertDays: { min: 1, max: 365 },
  returnAlertDays: { min: 1, max: 60 },
} as const;

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const router = useRouter();

const warrantyAlertDays = ref(String(user.value?.warrantyAlertDays ?? 30));
const returnAlertDays = ref(String(user.value?.returnAlertDays ?? 7));

const fields = ref<Record<string, string>>({});
const saving = ref(false);
const toast = ref<string | null>(null);

/** The sentence is the point of this screen. A number in a box does not tell
 *  anyone what it will do (ui-guide §6 S7). */
/** A window of 1 is ordinary, so the sentence has to say "1 day". */
function window_(value: string): string {
  const days = Number(value);
  return value !== '' && Number.isFinite(days) ? pluralDays(days) : '— days';
}

const preview = computed(
  () =>
    `Purchase Tracker will warn you ${window_(returnAlertDays.value)} before a return window closes, and ${window_(warrantyAlertDays.value)} before a warranty ends.`,
);

function validate(): boolean {
  const next: Record<string, string> = {};

  for (const [key, ref_] of [
    ['warrantyAlertDays', warrantyAlertDays],
    ['returnAlertDays', returnAlertDays],
  ] as const) {
    const { min, max } = RANGES[key];
    const value = Number(ref_.value);

    if (!Number.isInteger(value) || value < min || value > max) {
      next[key] = `Enter a whole number between ${min} and ${max}.`;
    }
  }

  fields.value = next;
  return Object.keys(next).length === 0;
}

async function save(): Promise<void> {
  // Checked here first: a request that is certain to 400 is a wasted round
  // trip and a worse message than the form can give straight away.
  if (!validate()) return;

  saving.value = true;

  try {
    const settings = await api<{ warrantyAlertDays: number; returnAlertDays: number }>(
      '/users/me/settings',
      {
        method: 'PATCH',
        body: {
          warrantyAlertDays: Number(warrantyAlertDays.value),
          returnAlertDays: Number(returnAlertDays.value),
        },
      },
    );

    // US-08: the dashboard reads these from the store, so it has to change
    // here too or the new windows only take effect on a reload.
    if (user.value) {
      user.value.warrantyAlertDays = settings.warrantyAlertDays;
      user.value.returnAlertDays = settings.returnAlertDays;
    }

    toast.value = 'Settings saved';
  } catch (failure) {
    fields.value =
      failure instanceof ApiError && failure.fields
        ? failure.fields
        : { returnAlertDays: 'Could not save your settings. Please try again.' };
  } finally {
    saving.value = false;
  }
}

async function signOut(): Promise<void> {
  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <AppShell>
    <!-- ui-guide §2: one centred 640px column, so the heading, the form and
         the account card stay aligned instead of hugging the left edge of a
         wide monitor. -->
    <div class="mx-auto max-w-[640px]">
      <h1 class="font-heading text-2xl font-semibold text-fg lg:text-[28px]">Settings</h1>
      <p class="mt-1 text-muted-fg">
        How far ahead Purchase Tracker warns you, and the account you are signed in to.
      </p>

      <form class="mt-6 flex flex-col gap-6" novalidate @submit.prevent="save">
        <fieldset class="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:p-6">
          <legend class="px-1 font-heading text-lg font-semibold text-fg">Alerts</legend>

          <BaseInput
            id="warrantyAlertDays"
            v-model="warrantyAlertDays"
            label="Warn me before a warranty ends"
            inputmode="numeric"
            hint="Days, between 1 and 365."
            :error="fields.warrantyAlertDays"
          />

          <BaseInput
            id="returnAlertDays"
            v-model="returnAlertDays"
            label="Warn me before a return window closes"
            inputmode="numeric"
            hint="Days, between 1 and 60."
            :error="fields.returnAlertDays"
          />

          <p class="rounded-sm bg-subtle px-3 py-2 text-fg">{{ preview }}</p>
        </fieldset>

        <div class="flex justify-end">
          <BaseButton type="submit" :loading="saving" loading-label="Saving…"
            >Save settings</BaseButton
          >
        </div>
      </form>

      <section
        class="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface p-4 lg:p-6"
      >
        <div class="min-w-0">
          <h2 class="font-heading text-lg font-semibold text-fg">Account</h2>
          <p class="truncate text-fg">{{ user?.name }}</p>
          <p class="truncate text-sm text-muted-fg">{{ user?.email }}</p>
        </div>
        <!-- ui-guide §5: on a phone this is the only way out, since the bottom
           bar has no room for it. -->
        <BaseButton data-testid="sign-out" variant="secondary" @click="signOut">
          <LogOut :size="18" aria-hidden="true" />
          Sign out
        </BaseButton>
      </section>
    </div>

    <div v-if="toast" class="fixed right-4 bottom-20 z-50 lg:bottom-4">
      <ToastMessage :message="toast" @dismiss="toast = null" />
    </div>
  </AppShell>
</template>
