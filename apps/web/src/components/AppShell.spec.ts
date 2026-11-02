import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppShell from './AppShell.vue';
import { useAuthStore } from '../stores/auth';

/** FE-PAGE-04 from docs/test-cases.md §4. */
describe('AppShell', () => {
  const blank = { template: '<div />' };

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', name: 'dashboard', component: blank },
      { path: '/purchases', name: 'purchases', component: blank },
      { path: '/purchases/new', name: 'purchase-new', component: blank },
      { path: '/purchases/:purchaseId', name: 'purchase-details', component: blank },
      { path: '/settings', name: 'settings', component: blank },
    ],
  });

  beforeEach(() => setActivePinia(createPinia()));

  const shell = async (path: string) => {
    useAuthStore().user = {
      id: 'u1',
      name: 'Winston',
      email: 'demo@proofly.test',
      warrantyAlertDays: 30,
      returnAlertDays: 7,
    };
    await router.push(path);
    await router.isReady();
    return mount(AppShell, { global: { plugins: [router] } });
  };

  it('FE-PAGE-04 the current page is marked, not merely tinted', async () => {
    const wrapper = await shell('/dashboard');

    const current = wrapper.findAll('[aria-current="page"]');
    expect(current.length).toBeGreaterThan(0);
    for (const link of current) expect(link.text()).toContain('Dashboard');
  });

  it('FE-PAGE-04 the marker follows the route', async () => {
    const wrapper = await shell('/purchases');

    const current = wrapper.findAll('[aria-current="page"]');
    expect(current.length).toBeGreaterThan(0);
    for (const link of current) expect(link.text()).toMatch(/purchases/i);
  });

  // FE-PAGE-33. /purchases/:id is a sibling route, not a child of /purchases,
  // so vue-router's own "inclusive" match does not consider the list link
  // active there — and the sidebar went blank on every detail page.
  it('FE-PAGE-33 a purchase page keeps My purchases marked', async () => {
    const wrapper = await shell('/purchases/p1');

    const current = wrapper.findAll('[aria-current="page"]');
    expect(current.length).toBeGreaterThan(0);
    for (const link of current) expect(link.text()).toMatch(/purchases/i);
  });

  it('FE-PAGE-33 the add form keeps My purchases marked', async () => {
    const wrapper = await shell('/purchases/new');

    const current = wrapper.findAll('[aria-current="page"]');
    expect(current.length).toBeGreaterThan(0);
    for (const link of current) expect(link.text()).toMatch(/purchases/i);
  });

  it('FE-PAGE-33 one section at a time is current', async () => {
    const wrapper = await shell('/purchases/p1');

    // Dashboard must not light up just because /purchases/p1 is not /dashboard.
    const current = wrapper.findAll('[aria-current="page"]');
    for (const link of current) expect(link.text()).not.toMatch(/dashboard/i);
  });

  it('offers every nav target from ui-guide §5', async () => {
    const wrapper = await shell('/dashboard');
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));

    for (const target of ['/dashboard', '/purchases', '/purchases/new', '/settings']) {
      expect(hrefs).toContain(target);
    }
  });

  it('shows who is signed in, and a way out', async () => {
    const wrapper = await shell('/dashboard');

    expect(wrapper.text()).toContain('Winston');
    expect(wrapper.text()).toContain('demo@proofly.test');
    expect(wrapper.text()).toMatch(/sign out/i);
  });

  it('renders both navigations, so the layout can choose by width', async () => {
    const wrapper = await shell('/dashboard');

    // Sidebar at lg and up, bottom tab bar below — one markup, two layouts,
    // rather than a JS breakpoint that guesses before hydration.
    expect(wrapper.html()).toContain('lg:flex');
    expect(wrapper.html()).toContain('lg:hidden');
    expect(wrapper.findAll('nav').length).toBeGreaterThanOrEqual(2);
  });
});
