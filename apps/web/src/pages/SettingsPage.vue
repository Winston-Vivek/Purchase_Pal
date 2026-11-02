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
  // BR-12: wider than a return, because a service can be a year out.
  serviceAlertDays: { min: 1, max: 365 },
} as const;

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const router = useRouter();

const warrantyAlertDays = ref(String(user.value?.warrantyAlertDays ?? 30));
const returnAlertDays = ref(String(user.value?.returnAlertDays ?? 7));
const serviceAlertDays = ref(String(user.value?.serviceAlertDays ?? 14));

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
    `Purchase Tracker will warn you ${window_(returnAlertDays.value)} before a return window closes, ${window_(warrantyAlertDays.value)} before a warranty ends, and ${window_(serviceAlertDays.value)} before a service is due.`,
);

// ---------------------------------------------------------- password ------
const currentPassword = ref('');
const newPassword = ref('');
const newPasswordConfirmation = ref('');
const passwordFields = ref<Record<string, string>>({});
const changingPassword = ref(false);

async function changePassword(): Promise<void> {
  passwordFields.value = {};

  // The server never sees the confirmation: it exists to catch a typo, which
  // is a question only this form can ask.
  if (newPassword.value !== newPasswordConfirmation.value) {
    passwordFields.value = { newPasswordConfirmation: 'The two passwords do not match' };
    return;
  }

  changingPassword.value = true;
  try {
    await api('/auth/password', {
      method: 'PATCH',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value },
    });

    // Cleared on success: a password left in a field is one shoulder-surf
    // from being read, and the form has no further use for it.
    currentPassword.value = '';
    newPassword.value = '';
    newPasswordConfirmation.value = '';
    toast.value = 'Password changed. Other devices have been signed out.';
  } catch (failure) {
    passwordFields.value =
      failure instanceof ApiError && failure.fields
        ? failure.fields
        : { currentPassword: 'Could not change your password. Please try again.' };
  } finally {
    changingPassword.value = false;
  }
}

function validate(): boolean {
  const next: Record<string, string> = {};

  for (const [key, ref_] of [
    ['warrantyAlertDays', warrantyAlertDays],
    ['returnAlertDays', returnAlertDays],
    ['serviceAlertDays', serviceAlertDays],
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
    const settings = await api<{
      warrantyAlertDays: number;
      returnAlertDays: number;
      serviceAlertDays: number;
    }>('/users/me/settings', {
      method: 'PATCH',
      body: {
        warrantyAlertDays: Number(warrantyAlertDays.value),
        returnAlertDays: Number(returnAlertDays.value),
        serviceAlertDays: Number(serviceAlertDays.value),
      },
    });

    // US-08: the dashboard reads these from the store, so it has to change
    // here too or the new windows only take effect on a reload.
    if (user.value) {
      user.value.warrantyAlertDays = settings.warrantyAlertDays;
      user.value.returnAlertDays = settings.returnAlertDays;
      user.value.serviceAlertDays = settings.serviceAlertDays;
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

      <form
        class="mt-6 flex flex-col gap-6"
        data-testid="settings-form"
        novalidate
        @submit.prevent="save"
      >
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

          <BaseInput
            id="serviceAlertDays"
            v-model="serviceAlertDays"
            label="Warn me before a service is due"
            inputmode="numeric"
            hint="Days, between 1 and 365."
            :error="fields.serviceAlertDays"
          />

          <p class="rounded-sm bg-subtle px-3 py-2 text-fg">{{ preview }}</p>
        </fieldset>

        <div class="flex justify-end">
          <BaseButton type="submit" :loading="saving" loading-label="Saving…"
            >Save settings</BaseButton
          >
        </div>
      </form>

      <form
        class="mt-6 flex flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:p-6"
        data-testid="password-form"
        novalidate
        @submit.prevent="changePassword"
      >
        <div>
          <h2 class="font-heading text-lg font-semibold text-fg">Password</h2>
          <!-- Said before they start, not after: the consequence is the point. -->
          <p class="mt-1 text-sm text-muted-fg">
            Changing it signs you out everywhere else. This device stays signed in.
          </p>
        </div>

        <BaseInput
          id="currentPassword"
          v-model="currentPassword"
          label="Current password"
          type="password"
          autocomplete="current-password"
          :error="passwordFields.currentPassword"
          required
        />

        <BaseInput
          id="newPassword"
          v-model="newPassword"
          label="New password"
          type="password"
          autocomplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          :error="passwordFields.newPassword"
          required
        />

        <BaseInput
          id="newPasswordConfirmation"
          v-model="newPasswordConfirmation"
          label="Confirm new password"
          type="password"
          autocomplete="new-password"
          :error="passwordFields.newPasswordConfirmation"
          required
        />

        <div class="flex justify-end">
          <BaseButton type="submit" :loading="changingPassword" loading-label="Changing…">
            Change password
          </BaseButton>
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
