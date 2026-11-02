import {
  createRouter,
  createWebHistory,
  type LocationQuery,
  type Router,
  type RouteRecordRaw,
  type RouterHistory,
} from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { public: true, title: 'Sign in · Purchase Tracker' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../pages/RegisterPage.vue'),
    meta: { public: true, title: 'Create account · Purchase Tracker' },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../pages/ForgotPasswordPage.vue'),
    meta: { public: true, title: 'Forgot password · Purchase Tracker' },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('../pages/ResetPasswordPage.vue'),
    meta: { public: true, title: 'Set a new password · Purchase Tracker' },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../pages/DashboardPage.vue'),
    meta: { title: 'Dashboard · Purchase Tracker' },
  },
  {
    path: '/purchases',
    name: 'purchases',
    component: () => import('../pages/PurchasesPage.vue'),
    meta: { title: 'My purchases · Purchase Tracker' },
  },
  {
    path: '/purchases/new',
    name: 'purchase-new',
    component: () => import('../pages/PurchaseFormPage.vue'),
    meta: { title: 'Add purchase · Purchase Tracker' },
  },
  {
    path: '/purchases/:purchaseId',
    name: 'purchase-details',
    component: () => import('../pages/PurchaseDetailsPage.vue'),
    meta: { title: 'Purchase · Purchase Tracker' },
  },
  {
    path: '/purchases/:purchaseId/edit',
    name: 'purchase-edit',
    component: () => import('../pages/PurchaseFormPage.vue'),
    meta: { title: 'Edit purchase · Purchase Tracker' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../pages/ProfilePage.vue'),
    meta: { title: 'Profile · Purchase Tracker' },
  },
  {
    // Public: the token is the authority, and the link is usually opened in a
    // browser that was never signed in — which is the point of the exercise.
    path: '/confirm-email',
    name: 'confirm-email',
    component: () => import('../pages/ConfirmEmailPage.vue'),
    meta: { public: true, title: 'Confirm your email · Purchase Tracker' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsPage.vue'),
    meta: { title: 'Settings · Purchase Tracker' },
  },
];

/**
 * Where to go after signing in.
 *
 * `?redirect=` is attacker controllable — it survives a link in an email — so
 * only a path on this site is honoured. Anything else, including
 * `https://evil.example`, `//evil.example` and `javascript:`, falls back to
 * the dashboard. A sign-in form that follows an arbitrary redirect is a
 * phishing primitive.
 */
export function resolveRedirect(query: LocationQuery | Record<string, unknown>): string {
  const target = (query as Record<string, unknown>).redirect;

  if (typeof target !== 'string' || target === '') return '/dashboard';
  if (!target.startsWith('/') || target.startsWith('//')) return '/dashboard';

  return target;
}

function installGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();

    // Once per page load, not once per navigation.
    if (!auth.resolved) await auth.restore();

    if (auth.isAuthenticated) {
      // Links carrying a token are the exception: the token is the authority,
      // not whoever happens to be signed in on this browser. Bouncing to the
      // dashboard makes an emailed link look broken — and for a confirmation
      // the whole point is that it was opened in a different inbox's browser.
      if (to.name === 'reset-password' || to.name === 'confirm-email') return true;

      // Signed in and heading for sign-in: move on, do not bounce.
      return to.meta.public === true ? { path: '/dashboard' } : true;
    }

    // Signed out on a public page is fine — returning a redirect to /login
    // from /login is how a guard hangs the app.
    if (to.meta.public === true) return true;

    return { path: '/login', query: { redirect: to.fullPath } };
  });

  // ui-guide §8: the title says which screen you are on.
  router.afterEach((to) => {
    const title = to.meta.title;
    document.title = typeof title === 'string' ? title : 'Purchase Tracker';
  });
}

export function createAppRouter(history: RouterHistory = createWebHistory()): Router {
  const router = createRouter({ history, routes });
  installGuards(router);
  return router;
}
