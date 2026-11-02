<script setup lang="ts">
import { MailCheck } from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { ApiError, api } from '../api/client';
import AppShell from '../components/AppShell.vue';
import BaseButton from '../components/BaseButton.vue';
import BaseInput from '../components/BaseInput.vue';
import ToastMessage from '../components/ToastMessage.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const { user } = storeToRefs(auth);

const toast = ref<string | null>(null);

// ------------------------------------------------------------------ name --
const name = ref(user.value?.name ?? '');
const nameFields = ref<Record<string, string>>({});
const savingName = ref(false);

async function saveName(): Promise<void> {
  nameFields.value = {};
  savingName.value = true;

  try {
    const updated = await api<{ name: string }>('/users/me', {
      method: 'PATCH',
      body: { name: name.value },
    });
    // The sidebar reads this, so it has to change here or the new name only
    // appears after a reload.
    if (user.value) user.value.name = updated.name;
    toast.value = 'Name saved';
  } catch (failure) {
    nameFields.value =
      failure instanceof ApiError && failure.fields
        ? failure.fields
        : { name: 'Could not save your name. Please try again.' };
  } finally {
    savingName.value = false;
  }
}

// ----------------------------------------------------------------- email --
const email = ref('');
const currentPassword = ref('');
const emailFields = ref<Record<string, string>>({});
const requestingEmail = ref(false);
const pendingEmail = ref<string | null>(null);

/**
 * BR-15: this asks for a change, it does not make one. Saying so plainly
 * matters — otherwise the address appears to have changed and the user stops
 * looking for the email that actually completes it.
 */
async function requestEmailChange(): Promise<void> {
  emailFields.value = {};
  requestingEmail.value = true;

  try {
    await api('/users/me/email', {
      method: 'POST',
      body: { email: email.value, currentPassword: currentPassword.value },
    });
    pendingEmail.value = email.value;
    email.value = '';
    currentPassword.value = '';
  } catch (failure) {
    emailFields.value =
      failure instanceof ApiError && failure.fields
        ? failure.fields
        : {
            email:
              failure instanceof ApiError
                ? failure.message
                : 'Could not start the change. Please try again.',
          };
  } finally {
    requestingEmail.value = false;
  }
}
</script>

<template>
  <AppShell>
    <div class="mx-auto max-w-[640px] lg:max-w-[1040px]">
      <h1 class="font-heading text-2xl font-semibold text-fg lg:text-[28px]">Profile</h1>
      <p class="mt-1 text-muted-fg">Your name, and the address you sign in with.</p>

      <div class="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <form
          class="flex flex-col gap-6"
          data-testid="name-form"
          novalidate
          @submit.prevent="saveName"
        >
          <fieldset
            class="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:p-6"
          >
            <legend class="px-1 font-heading text-lg font-semibold text-fg">Name</legend>

            <BaseInput
              id="name"
              v-model="name"
              label="Your name"
              autocomplete="name"
              :error="nameFields.name"
              required
            />
          </fieldset>

          <div class="flex justify-end">
            <BaseButton type="submit" :loading="savingName" loading-label="Saving…">
              Save name
            </BaseButton>
          </div>
        </form>

        <form
          class="flex flex-col gap-6"
          data-testid="email-form"
          novalidate
          @submit.prevent="requestEmailChange"
        >
          <fieldset
            class="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:p-6"
          >
            <legend class="px-1 font-heading text-lg font-semibold text-fg">Email</legend>

            <p class="text-sm text-muted-fg">
              You sign in with <strong class="text-fg">{{ user?.email }}</strong
              >. Changing it needs a link sent to the new address, so nothing moves until you prove
              you read it.
            </p>

            <p
              v-if="pendingEmail"
              data-testid="email-pending"
              class="flex items-start gap-2 rounded-sm bg-ok-bg px-3 py-3 text-ok-fg"
            >
              <MailCheck :size="18" aria-hidden="true" class="mt-0.5 shrink-0" />
              <span>
                Check <strong>{{ pendingEmail }}</strong> and open the link to finish. Until then
                you keep signing in with your current address.
              </span>
            </p>

            <BaseInput
              id="email"
              v-model="email"
              label="New email address"
              type="email"
              autocomplete="email"
              :error="emailFields.email"
            />

            <BaseInput
              id="currentPassword"
              v-model="currentPassword"
              label="Current password"
              type="password"
              autocomplete="current-password"
              hint="Asked for so a borrowed session cannot move your account."
              :error="emailFields.currentPassword"
            />
          </fieldset>

          <div class="flex justify-end">
            <BaseButton type="submit" :loading="requestingEmail" loading-label="Sending…">
              Send confirmation link
            </BaseButton>
          </div>
        </form>
      </div>
    </div>

    <div v-if="toast" class="fixed right-4 bottom-20 z-50 lg:bottom-4">
      <ToastMessage :message="toast" @dismiss="toast = null" />
    </div>
  </AppShell>
</template>
