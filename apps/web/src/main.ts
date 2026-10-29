import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './assets/main.css';
import { router } from './router';

const app = createApp(App);

// Pinia before the router: a navigation guard may read a store, and a store
// used before Pinia is installed throws (pinia-no-active-pinia-error).
app.use(createPinia());
app.use(router);

app.mount('#app');
