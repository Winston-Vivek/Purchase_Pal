<script setup lang="ts">
import { House, LayoutGrid, LogOut, Plus, ShoppingBag, SlidersHorizontal } from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
// storeToRefs, not plain destructuring, which would break reactivity
// (vue-pinia-best-practices).
const { user } = storeToRefs(auth);
const router = useRouter();

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: House },
  { to: '/purchases', label: 'My purchases', icon: ShoppingBag },
  { to: '/settings', label: 'Settings', icon: SlidersHorizontal },
] as const;

const initial = computed(() => user.value?.name.charAt(0).toUpperCase() ?? '?');

async function signOut(): Promise<void> {
  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <div class="min-h-dvh bg-bg">
    <!-- Desktop: 240px sidebar from ui-guide §2. One markup, two layouts,
         chosen in CSS — a JS breakpoint has to guess before hydration. -->
    <aside
      class="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface px-4 py-6 lg:flex"
    >
      <!-- `custom` so the logo does not also claim aria-current="page": it is
           a way home, not a marker of where you are. -->
      <RouterLink v-slot="{ href, navigate }" to="/dashboard" custom>
        <a :href="href" class="flex cursor-pointer items-center gap-2 px-2" @click="navigate">
          <span class="flex size-8 items-center justify-center rounded-md bg-primary text-white">
            <LayoutGrid :size="18" aria-hidden="true" />
          </span>
          <span class="font-heading text-lg font-semibold text-fg">Proofly</span>
        </a>
      </RouterLink>

      <RouterLink
        to="/purchases/new"
        class="mt-6 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-white transition-colors duration-150 hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden motion-reduce:transition-none"
      >
        <Plus :size="18" aria-hidden="true" />
        Add purchase
      </RouterLink>

      <nav aria-label="Main" class="mt-6 flex flex-col gap-1">
        <RouterLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 font-semibold text-muted-fg transition-colors duration-150 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none"
          active-class="bg-primary-tint text-primary before:absolute before:left-0 before:h-6 before:w-1 before:rounded-sm before:bg-primary"
        >
          <component :is="item.icon" :size="20" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="mt-auto flex items-center gap-3 border-t border-border pt-4">
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-tint font-semibold text-primary"
          aria-hidden="true"
        >
          {{ initial }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-semibold text-fg">{{ user?.name }}</span>
          <!-- The 240px sidebar truncates a long address; title makes it readable. -->
          <span :title="user?.email" class="block truncate text-sm text-muted-fg">{{ user?.email }}</span>
        </span>
        <button
          type="button"
          class="flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          @click="signOut"
        >
          <LogOut :size="20" aria-hidden="true" />
          <span class="sr-only">Sign out</span>
        </button>
      </div>
    </aside>

    <!-- Mobile: top bar and a bottom tab bar. -->
    <header
      class="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden"
    >
      <RouterLink v-slot="{ href, navigate }" to="/dashboard" custom>
        <a :href="href" class="flex min-h-11 cursor-pointer items-center gap-2" @click="navigate">
          <span class="flex size-8 items-center justify-center rounded-md bg-primary text-white">
            <LayoutGrid :size="18" aria-hidden="true" />
          </span>
          <span class="font-heading text-lg font-semibold text-fg">Proofly</span>
        </a>
      </RouterLink>
      <span
        class="flex size-9 items-center justify-center rounded-full bg-primary-tint font-semibold text-primary"
        :aria-label="user?.name"
      >
        {{ initial }}
      </span>
    </header>

    <main class="px-4 py-6 pb-24 lg:ml-60 lg:px-8 lg:pb-8">
      <div class="mx-auto max-w-[1200px]"><slot /></div>
    </main>

    <nav
      aria-label="Main"
      class="fixed inset-x-0 bottom-0 flex items-stretch justify-around border-t border-border bg-surface lg:hidden"
    >
      <RouterLink
        to="/dashboard"
        class="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold text-muted-fg"
        active-class="text-primary"
      >
        <House :size="20" aria-hidden="true" />
        Dashboard
      </RouterLink>
      <RouterLink
        to="/purchases"
        class="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold text-muted-fg"
        active-class="text-primary"
      >
        <ShoppingBag :size="20" aria-hidden="true" />
        Purchases
      </RouterLink>
      <RouterLink
        to="/purchases/new"
        class="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold text-muted-fg"
      >
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-white">
          <Plus :size="18" aria-hidden="true" />
        </span>
        Add
      </RouterLink>
      <RouterLink
        to="/settings"
        class="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold text-muted-fg"
        active-class="text-primary"
      >
        <SlidersHorizontal :size="20" aria-hidden="true" />
        Settings
      </RouterLink>
    </nav>
  </div>
</template>
