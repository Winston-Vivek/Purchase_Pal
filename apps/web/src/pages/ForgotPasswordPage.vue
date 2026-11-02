<script setup lang="ts">
import { MailCheck } from '@lucide/vue';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api/client';
import AuthCard from '../components/AuthCard.vue';
import BaseButton from '../components/BaseButton.vue';
import BaseInput from '../components/BaseInput.vue';

const email = ref('');
const sending = ref(false);
const sent = ref(false);

/**
 * BR-14: the same answer whether or not the address has an account.
 *
 * The page must not leak what the API is careful not to — so it shows the
 * confirmation on any outcome, including a network failure, rather than an
 * error that would hint the address was special.
 */
async function submit(): Promise<void> {
  if (email.value.trim() === '') return;

  sending.value = true;
  try {
    await api('/auth/forgot-password', { method: 'POST', body: { email: email.value } });
  } catch {
    // Deliberately swallowed. See above.
  } finally {
    sending.value = false;
    sent.value = true;
  }
}
</script>

<template>
  <AuthCard title="Forgot your password?">
    <template v-if="sent">
      <p
        data-testid="sent"
        class="mt-4 flex items-start gap-2 rounded-sm bg-ok-bg px-3 py-3 text-ok-fg"
      >
        <MailCheck :size="18" aria-hidden="true" class="mt-0.5 shrink-0" />
        <span>
          If <strong>{{ email }}</strong> has an account, we have sent a link to reset the password.
          It works once and expires in 30 minutes.
        </span>
      </p>
      <p class="mt-4 text-sm text-muted-fg">
        Nothing arrived? Check the spam folder, then
        <button
          type="button"
          class="cursor-pointer font-semibold text-primary hover:underline"
          @click="sent = false"
        >
          try another address</button
        >.
      </p>
    </template>

    <form v-else class="mt-4 flex flex-col gap-4" novalidate @submit.prevent="submit">
      <p class="text-muted-fg">
        Enter the address you signed up with and we will email you a link to set a new password.
      </p>

      <BaseInput
        id="email"
        v-model="email"
        label="Email"
        type="email"
        autocomplete="email"
        required
      />

      <BaseButton type="submit" :loading="sending" loading-label="Sending…">
        Email me a link
      </BaseButton>
    </form>

    <template #footer>
      Remembered it?
      <RouterLink to="/login" class="font-semibold text-primary hover:underline">
        Sign in
      </RouterLink>
    </template>
  </AuthCard>
</template>
