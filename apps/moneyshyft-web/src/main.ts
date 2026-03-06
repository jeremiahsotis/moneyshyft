import { createApp } from 'vue';
import router from './router';
import pinia from './pinia';
import App from './App.vue';
import './assets/main.css';

const app = createApp(App);

app.use(pinia);
app.use(router);

app.mount('#app');

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    });
  } else {
    // Keep dev sessions deterministic by removing old SW/caches from prior builds.
    window.addEventListener('load', async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    });
  }
}
