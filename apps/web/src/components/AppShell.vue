<script setup lang="ts">
import {
  UserRound,
  KeyRound,
  ChevronUp,
  House,
  LayoutGrid,
  LogOut,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
} from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import RowMenu from './RowMenu.vue';
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

const route = useRoute();

/**
 * Whether a nav item owns the current screen.
 *
 * RouterLink's own active-class is no use here: /purchases/:id and
 * /purchases/new are sibling route records, not children of /purchases, so
 * vue-router does not consider the list link active on them and the sidebar
 * went blank on every purchase page. A path prefix is what "section" means
 * to the person reading the sidebar.
 */
function isCurrent(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`);
}

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
          <span class="font-heading text-base font-semibold whitespace-nowrap text-fg"
            >Purchase Tracker</span
          >
        </a>
      </RouterLink>

      <!-- `custom` for the same reason as the logo: this is an action, not a
           marker of where you are. Left to itself RouterLink would also claim
           aria-current="page" on /purchases/new, and the screen would have two
           "current page" markers. -->
      <RouterLink v-slot="{ href, navigate }" to="/purchases/new" custom>
        <a
          :href="href"
          class="mt-6 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-white transition-colors duration-150 hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden motion-reduce:transition-none"
          @click="navigate"
        >
          <Plus :size="18" aria-hidden="true" />
          Add purchase
        </a>
      </RouterLink>

      <nav aria-label="Main" class="mt-6 flex flex-col gap-1">
        <RouterLink
          v-for="item in NAV"
          :key="item.to"
          v-slot="{ href, navigate }"
          :to="item.to"
          custom
        >
          <a
            :href="href"
            :aria-current="isCurrent(item.to) ? 'page' : undefined"
            class="relative flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 font-semibold transition-colors duration-150 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none"
            :class="
              isCurrent(item.to)
                ? 'bg-primary-tint text-primary before:absolute before:left-0 before:h-6 before:w-1 before:rounded-sm before:bg-primary'
                : 'text-muted-fg'
            "
            @click="navigate"
          >
            <component :is="item.icon" :size="20" aria-hidden="true" />
            {{ item.label }}
          </a>
        </RouterLink>
      </nav>

      <!-- The avatar that was already here is the trigger: everything about
           "you" behind one thing to click, rather than a name tag with a lone
           icon button beside it. -->
      <div class="mt-auto border-t border-border pt-4">
        <RowMenu
          label="Your account"
          test-id="account-menu"
          trigger-class="flex w-full min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          <template #trigger>
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-tint font-semibold text-primary"
              aria-hidden="true"
            >
              {{ initial }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold text-fg">{{ user?.name }}</span>
              <!-- The 240px sidebar truncates a long address; title makes it readable. -->
              <span :title="user?.email" class="block truncate text-sm text-muted-fg">{{
                user?.email
              }}</span>
            </span>
            <ChevronUp :size="18" aria-hidden="true" class="shrink-0 text-muted-fg" />
          </template>

          <RouterLink
            to="/profile"
            role="menuitem"
            class="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold text-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <UserRound :size="16" aria-hidden="true" />
            View profile
          </RouterLink>
          <RouterLink
            to="/settings"
            role="menuitem"
            class="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold text-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <SlidersHorizontal :size="16" aria-hidden="true" />
            Change settings
          </RouterLink>
          <RouterLink
            to="/settings#password"
            role="menuitem"
            class="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold text-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <KeyRound :size="16" aria-hidden="true" />
            Change password
          </RouterLink>
          <button
            type="button"
            role="menuitem"
            class="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-left font-semibold text-fg hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
            @click="signOut"
          >
            <LogOut :size="16" aria-hidden="true" />
            Sign out
          </button>
        </RowMenu>
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
          <span class="font-heading text-base font-semibold whitespace-nowrap text-fg"
            >Purchase Tracker</span
          >
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
      <RouterLink v-slot="{ href, navigate }" to="/dashboard" custom>
        <a
          :href="href"
          :aria-current="isCurrent('/dashboard') ? 'page' : undefined"
          class="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold"
          :class="isCurrent('/dashboard') ? 'text-primary' : 'text-muted-fg'"
          @click="navigate"
        >
          <House :size="20" aria-hidden="true" />
          Dashboard
        </a>
      </RouterLink>
      <RouterLink v-slot="{ href, navigate }" to="/purchases" custom>
        <a
          :href="href"
          :aria-current="isCurrent('/purchases') ? 'page' : undefined"
          class="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold"
          :class="isCurrent('/purchases') ? 'text-primary' : 'text-muted-fg'"
          @click="navigate"
        >
          <ShoppingBag :size="20" aria-hidden="true" />
          Purchases
        </a>
      </RouterLink>
      <RouterLink v-slot="{ href, navigate }" to="/purchases/new" custom>
        <a
          :href="href"
          class="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold text-muted-fg"
          @click="navigate"
        >
          <span class="flex size-8 items-center justify-center rounded-full bg-primary text-white">
            <Plus :size="18" aria-hidden="true" />
          </span>
          Add
        </a>
      </RouterLink>
      <RouterLink v-slot="{ href, navigate }" to="/settings" custom>
        <a
          :href="href"
          :aria-current="isCurrent('/settings') ? 'page' : undefined"
          class="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold"
          :class="isCurrent('/settings') ? 'text-primary' : 'text-muted-fg'"
          @click="navigate"
        >
          <SlidersHorizontal :size="20" aria-hidden="true" />
          Settings
        </a>
      </RouterLink>
    </nav>
  </div>
</template>
