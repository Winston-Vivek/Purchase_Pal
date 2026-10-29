import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { onUnauthorized } from './api/client';
import './assets/main.css';
import { createAppRouter } from './router';
import { useAuthStore } from './stores/auth';

const app = createApp(App);

// Pinia before the router: a navigation guard reads the auth store, and a
// store used before Pinia is installed throws (pinia-no-active-pinia-error).
app.use(createPinia());

const router = createAppRouter();
app.use(router);

// A 401 on any data call means the cookie expired mid-session. Drop the user
// and send them to sign in, remembering where they were.
onUnauthorized(() => {
  useAuthStore().clear();
  const current = router.currentRoute.value;
  if (current.name !== 'login') {
    void router.replace({ path: '/login', query: { redirect: current.fullPath } });
  }
});

app.mount('#app');
