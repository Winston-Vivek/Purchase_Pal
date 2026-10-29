import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ApiError, api } from '../api/client';
import type { UserResponse } from '../api/types';

/**
 * A setup store returning every piece of state (vue-pinia-best-practices).
 *
 * The real session is the httpOnly cookie, which this code cannot read. `user`
 * is only what the server last told us, so `restore()` asks rather than assumes.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserResponse | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);
  /** Whether restore() has run. The guard uses this so the session is checked
   *  once per page load rather than once per navigation. */
  const resolved = ref(false);

  const isAuthenticated = computed(() => user.value !== null);

  function clear(): void {
    user.value = null;
  }

  function message(failure: unknown): string {
    return failure instanceof ApiError ? failure.message : 'Something went wrong. Please try again.';
  }

  async function submit(path: string, body: Record<string, unknown>): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      user.value = await api<UserResponse>(path, { method: 'POST', body, skipAuthRedirect: true });
      return true;
    } catch (failure) {
      user.value = null;
      error.value = message(failure);
      return false;
    } finally {
      loading.value = false;
      resolved.value = true;
    }
  }

  const login = (email: string, password: string): Promise<boolean> =>
    submit('/auth/login', { email, password });

  const register = (name: string, email: string, password: string): Promise<boolean> =>
    submit('/auth/register', { name, email, password });

  /** Asks the server who we are. A 401 here means "nobody", which is an
   *  answer, not a failure — hence skipAuthRedirect. */
  async function restore(): Promise<void> {
    try {
      user.value = await api<UserResponse>('/auth/me', { skipAuthRedirect: true });
    } catch {
      user.value = null;
    } finally {
      resolved.value = true;
    }
  }

  async function logout(): Promise<void> {
    try {
      await api('/auth/logout', { method: 'POST', skipAuthRedirect: true });
    } finally {
      // Cleared regardless: if the call failed the cookie may still be live,
      // but leaving the UI signed in would be worse than a stale cookie.
      clear();
      error.value = null;
    }
  }

  return { user, error, loading, resolved, isAuthenticated, login, register, logout, restore, clear };
});
