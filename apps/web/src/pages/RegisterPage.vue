<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import AuthCard from '../components/AuthCard.vue';
import BaseButton from '../components/BaseButton.vue';
import BaseInput from '../components/BaseInput.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const { error, fields, loading } = storeToRefs(auth);
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');

async function submit(): Promise<void> {
  if (await auth.register(name.value, email.value, password.value)) {
    await router.push('/dashboard');
  }
}
</script>

<template>
  <AuthCard title="Create your account">
    <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="submit">
      <!-- A 409 on a duplicate email has no field, so it is shown here rather
           than being swallowed. -->
      <p
        v-if="error && Object.keys(fields).length === 0"
        role="alert"
        class="rounded-sm border border-danger bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg"
      >
        {{ error }}
      </p>

      <BaseInput
        id="name"
        v-model="name"
        label="Your name"
        autocomplete="name"
        :error="fields.name"
        required
      />

      <BaseInput
        id="email"
        v-model="email"
        label="Email"
        type="email"
        inputmode="email"
        autocomplete="email"
        :error="fields.email"
        required
      />

      <!-- The rule is a hint, not something you find out by failing. -->
      <BaseInput
        id="password"
        v-model="password"
        label="Password"
        type="password"
        autocomplete="new-password"
        hint="At least 8 characters, including a letter and a number."
        :error="fields.password"
        required
      />

      <BaseButton type="submit" :loading="loading" loading-label="Creating…">
        Create account
      </BaseButton>
    </form>

    <template #footer>
      Already have an account?
      <RouterLink to="/login" class="cursor-pointer font-semibold text-primary underline">
        Sign in
      </RouterLink>
    </template>
  </AuthCard>
</template>
