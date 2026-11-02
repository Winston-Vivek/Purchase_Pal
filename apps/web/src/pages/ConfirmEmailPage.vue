<script setup lang="ts">
import { CircleCheck, XCircle } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ApiError, api } from '../api/client';
import AuthCard from '../components/AuthCard.vue';

const route = useRoute();
const token = computed(() => String((route.query as Record<string, unknown>).token ?? ''));

const state = ref<'working' | 'done' | 'failed'>('working');
const message = ref('');

/**
 * Confirmed on arrival rather than behind a button.
 *
 * The reader already decided — they clicked the link in their own inbox, which
 * is the whole proof being asked for. A second button would only be a place to
 * give up.
 */
onMounted(async () => {
  if (token.value === '') {
    state.value = 'failed';
    message.value = 'This link is incomplete. Ask for a new one from your profile.';
    return;
  }

  try {
    await api('/users/me/email/confirm', { method: 'POST', body: { token: token.value } });
    state.value = 'done';
  } catch (failure) {
    state.value = 'failed';
    message.value =
      failure instanceof ApiError
        ? failure.message
        : 'Could not confirm that address. Please try again.';
  }
});
</script>

<template>
  <AuthCard title="Confirming your address">
    <p v-if="state === 'working'" class="mt-4 text-muted-fg">One moment…</p>

    <p
      v-else-if="state === 'done'"
      data-testid="confirmed"
      class="mt-4 flex items-start gap-2 rounded-sm bg-ok-bg px-3 py-3 text-ok-fg"
    >
      <CircleCheck :size="18" aria-hidden="true" class="mt-0.5 shrink-0" />
      <span>That is now the address you sign in with.</span>
    </p>

    <p
      v-else
      data-testid="confirm-failed"
      role="alert"
      class="mt-4 flex items-start gap-2 rounded-sm bg-bad-bg px-3 py-3 text-bad-fg"
    >
      <XCircle :size="18" aria-hidden="true" class="mt-0.5 shrink-0" />
      <span>{{ message }}</span>
    </p>

    <template #footer>
      <RouterLink to="/login" class="font-semibold text-primary hover:underline">
        Go to sign in
      </RouterLink>
    </template>
  </AuthCard>
</template>
