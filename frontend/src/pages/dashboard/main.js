import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import '../../styles/main.css';
import languageManager from './languageManager';

languageManager.updatePageLanguage();

const app = createApp(App);
app.use(createPinia());
app.mount('#app-root');
