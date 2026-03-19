import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import pinia from './pinia';
import { SUBJECT_CONTEXT_KEY, createSubjectContext } from './shell/subjectContext';
import './assets/main.css';

const app = createApp(App);

app.provide(SUBJECT_CONTEXT_KEY, createSubjectContext());

app.use(pinia)
  .use(router)
  .mount('#app');
