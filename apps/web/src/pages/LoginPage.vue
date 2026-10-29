<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import AuthCard from '../components/AuthCard.vue';
import BaseButton from '../components/BaseButton.vue';
import BaseInput from '../components/BaseInput.vue';
import { resolveRedirect } from '../router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const { error, loading } = storeToRefs(auth);
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const revealed = ref(false);

async function submit(): Promise<void> {
  // The values stay in the refs whether this succeeds or fails, so a refused
  // attempt does not make the user retype their email (ui-guide §6).
  if (await auth.login(email.value, password.value)) {
    await router.push(resolveRedirect(route.query));
  }
}
</script>

<template>
  <AuthCard title="Sign in">
    <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="submit">
      <!-- One message above the form. It never says which half was wrong:
           a specific message turns this into account enumeration. -->
      <p
        v-if="error"
        role="alert"
        class="rounded-sm border border-danger bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg"
      >
        {{ error }}
      </p>

      <BaseInput
        id="email"
        v-model="email"
        label="Email"
        type="email"
        inputmode="email"
        autocomplete="email"
        required
      />

      <div class="relative">
        <BaseInput
          id="password"
          v-model="password"
          label="Password"
          :type="revealed ? 'text' : 'password'"
          autocomplete="current-password"
          required
        />
        <button
          type="button"
          class="absolute right-1 bottom-0 flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          :aria-pressed="revealed"
          @click="revealed = !revealed"
        >
          <component :is="revealed ? EyeOff : Eye" :size="20" aria-hidden="true" />
          <span class="sr-only">{{ revealed ? 'Hide password' : 'Show password' }}</span>
        </button>
      </div>

      <BaseButton type="submit" :loading="loading" loading-label="Signing in…">Sign in</BaseButton>
    </form>

    <template #footer>
      New here?
      <RouterLink to="/register" class="cursor-pointer font-semibold text-primary underline">
        Create an account
      </RouterLink>
    </template>
  </AuthCard>
</template>
