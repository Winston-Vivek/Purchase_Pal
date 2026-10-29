import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

/**
 * Routes land slice by slice (docs/plan.md Day 5). The shape is fixed now so
 * guards and the shell have something to attach to.
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: { title: 'Proofly' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ui-guide §8: the page title changes per route, so the tab and the browser
// history say which screen you are on.
router.afterEach((to) => {
  const title = to.meta.title;
  document.title = typeof title === 'string' ? title : 'Proofly';
});
