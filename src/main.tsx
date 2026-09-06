import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const isNative =
  typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor !== 'undefined' &&
  (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.() === true;

if (import.meta.env.PROD && 'serviceWorker' in navigator && !isNative) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('New content available, reload to update.');
    },
    onOfflineReady() {
      console.log('App ready to work offline.');
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
