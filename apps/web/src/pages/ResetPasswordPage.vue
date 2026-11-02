<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue';
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError, api } from '../api/client';
import AuthCard from '../components/AuthCard.vue';
import BaseButton from '../components/BaseButton.vue';
import BaseInput from '../components/BaseInput.vue';

const route = useRoute();
const router = useRouter();

const token = computed(() => String((route.query as Record<string, unknown>).token ?? ''));

const password = ref('');
const confirmation = ref('');
const revealed = ref(false);
const saving = ref(false);
const fields = ref<Record<string, string>>({});
const formError = ref<string | null>(null);

async function submit(): Promise<void> {
  fields.value = {};
  formError.value = null;

  // Checked here because the server never sees the confirmation: it exists to
  // catch a typo, which is a question only this form can ask.
  if (password.value !== confirmation.value) {
    fields.value = { confirmation: 'The two passwords do not match' };
    return;
  }

  saving.value = true;
  try {
    await api('/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    });
    // No session is issued by a reset, so this goes to sign in rather than to
    // the dashboard — possession of an inbox is not possession of an account.
    await router.push({ path: '/login', query: { reset: '1' } });
  } catch (failure) {
    if (failure instanceof ApiError && failure.fields) {
      fields.value = failure.fields;
    } else {
      formError.value =
        failure instanceof ApiError
          ? failure.message
          : 'Could not set your password. Please try again.';
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AuthCard title="Set a new password">
    <!-- A link with no token at all is a broken link, and saying so beats a
         form that can only fail. -->
    <p v-if="token === ''" data-testid="no-token" class="mt-4 text-muted-fg">
      This link is incomplete. Ask for a new one from
      <RouterLink to="/forgot-password" class="font-semibold text-primary hover:underline">
        Forgot your password?
      </RouterLink>
    </p>

    <form v-else class="mt-4 flex flex-col gap-4" novalidate @submit.prevent="submit">
      <p
        v-if="formError"
        role="alert"
        class="rounded-sm border border-danger bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg"
      >
        {{ formError }}
      </p>

      <div class="flex flex-col gap-1.5">
        <BaseInput
          id="password"
          v-model="password"
          label="New password"
          :type="revealed ? 'text' : 'password'"
          autocomplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          :error="fields.password"
          required
        />
        <button
          type="button"
          class="flex min-h-11 w-fit cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary"
          @click="revealed = !revealed"
        >
          <component :is="revealed ? EyeOff : Eye" :size="16" aria-hidden="true" />
          {{ revealed ? 'Hide' : 'Show' }} password
        </button>
      </div>

      <BaseInput
        id="confirmation"
        v-model="confirmation"
        label="Confirm new password"
        :type="revealed ? 'text' : 'password'"
        autocomplete="new-password"
        :error="fields.confirmation"
        required
      />

      <BaseButton type="submit" :loading="saving" loading-label="Saving…">
        Set new password
      </BaseButton>
    </form>

    <template #footer>
      <RouterLink to="/login" class="font-semibold text-primary hover:underline">
        Back to sign in
      </RouterLink>
    </template>
  </AuthCard>
</template>
