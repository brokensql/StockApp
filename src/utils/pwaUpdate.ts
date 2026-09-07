/**
 * PWA Update and Session Verification Manager
 * Ensures mobile devices (PWAs & browsers) automatically detect and apply updates,
 * handles Google AI Studio shared-link cookies seamlessly, and provides manual
 * update checking.
 */

import { registerSW } from 'virtual:pwa-register';

type UpdateCallback = (hasUpdate: boolean) => void;

let swRegistration: ServiceWorkerRegistration | null = null;
let updateSWHandler: ((reloadPage?: boolean) => Promise<void>) | null = null;
const listeners: Set<UpdateCallback> = new Set();
let isCheckingUpdate = false;
let refreshing = false;

export function initPWAUpdateManager() {
  if (typeof window === 'undefined') return;

  const isNative =
    typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor !== 'undefined' &&
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.() === true;

  if (isNative) return;

  // Unregister any stale dev-sw or legacy development service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        if (
          reg.active?.scriptURL.includes('dev-sw.js') ||
          reg.installing?.scriptURL.includes('dev-sw.js') ||
          reg.waiting?.scriptURL.includes('dev-sw.js')
        ) {
          console.log('[PWA] Unregistering stale dev-sw service worker:', reg.scope);
          reg.unregister();
        }
      }
    }).catch(() => {});
  }

  // Listen for controllerchange: when new Service Worker takes over, reload to apply updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('[PWA] New service worker activated, reloading for latest updates...');
      window.location.reload();
    });
  }

  // Only register service worker in production builds or if supported
  if (import.meta.env.DEV) {
    console.log('[PWA] Running in development mode - Service Worker registration bypassed.');
    return;
  }

  // Register service worker with auto-update in production
  updateSWHandler = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      swRegistration = registration;
      console.log('[PWA] Service Worker registered:', swUrl);

      // Check for updates immediately on load
      checkSWUpdate(registration);

      // Check for updates when user returns to app/tab
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkSWUpdate(registration);
        }
      });

      // Check on focus
      window.addEventListener('focus', () => {
        checkSWUpdate(registration);
      });

      // Check when coming back online
      window.addEventListener('online', () => {
        checkSWUpdate(registration);
        verifyShareCookie();
      });

      // Periodic check every 60 seconds
      setInterval(() => {
        checkSWUpdate(registration);
      }, 60 * 1000);
    },
    onNeedRefresh() {
      console.log('[PWA] New content available.');
      notifyListeners(true);
      if (updateSWHandler) {
        updateSWHandler(true);
      }
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline.');
      notifyListeners(false);
    },
    onRegisterError(error) {
      console.warn('[PWA] Service Worker registration info:', error);
    },
  });

  // Verify cookie on initial load
  verifyShareCookie();
}

function checkSWUpdate(registration: ServiceWorkerRegistration) {
  if (!navigator.onLine) return;
  registration.update().catch((err) => {
    console.debug('[PWA] Update check deferred:', err);
  });
}

function notifyListeners(hasUpdate: boolean) {
  listeners.forEach((cb) => {
    try {
      cb(hasUpdate);
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeToUpdates(callback: UpdateCallback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Manually trigger update check from UI (e.g. Settings / About modal)
 */
export async function checkForAppUpdate(): Promise<{
  status: 'updated' | 'no-update' | 'offline' | 'unsupported';
  message: string;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      status: 'unsupported',
      message: 'Service worker is not supported on this browser.',
    };
  }

  if (!navigator.onLine) {
    return {
      status: 'offline',
      message: 'You are currently offline. Connect to internet to check for updates.',
    };
  }

  if (isCheckingUpdate) {
    return {
      status: 'no-update',
      message: 'Update check already in progress...',
    };
  }

  isCheckingUpdate = true;

  try {
    const reg = swRegistration || (await navigator.serviceWorker.getRegistration());

    if (!reg) {
      isCheckingUpdate = false;
      return {
        status: 'no-update',
        message: 'You are using the latest version of StockApp.',
      };
    }

    // Skip update check if script is a stale dev-sw or in development
    if (
      reg.active?.scriptURL.includes('dev-sw.js') ||
      reg.installing?.scriptURL.includes('dev-sw.js') ||
      reg.waiting?.scriptURL.includes('dev-sw.js')
    ) {
      await reg.unregister();
      isCheckingUpdate = false;
      return {
        status: 'no-update',
        message: 'You are using the latest version of StockApp.',
      };
    }

    // Attempt registration update
    try {
      await reg.update();
    } catch (updateErr) {
      console.debug('[PWA] Service worker update call bypassed:', updateErr);
    }

    // Check if a new worker is installing or waiting
    if (reg.waiting || reg.installing) {
      if (updateSWHandler) {
        await updateSWHandler(true);
      }
      isCheckingUpdate = false;
      return {
        status: 'updated',
        message: 'New version found! Updating now...',
      };
    }

    // Also verify share cookie health
    await verifyShareCookie();

    isCheckingUpdate = false;
    return {
      status: 'no-update',
      message: 'You are already on the latest version of StockApp.',
    };
  } catch (error) {
    console.error('[PWA] Manual update check error:', error);
    isCheckingUpdate = false;
    return {
      status: 'no-update',
      message: 'Already on the latest available version.',
    };
  }
}

/**
 * Verifies that Google AI Studio shared cookie is valid.
 * If the server responds with a redirect to __cookie_check.html,
 * seamlessly navigates to complete the cookie refresh so the mobile app doesn't break.
 */
export async function verifyShareCookie(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) return true;

  // Only check if on a shared preview domain
  const host = window.location.hostname;
  if (!host.includes('ais-pre-') && !host.includes('run.app')) {
    return true;
  }

  try {
    const response = await fetch('/manifest.json', {
      method: 'HEAD',
      credentials: 'include',
      cache: 'no-store',
    });

    // If redirected to cookie check, navigate there to renew cookie
    if (response.redirected && response.url.includes('__cookie_check')) {
      console.warn('[PWA] Shared link cookie expired. Redirecting to refresh cookie...');
      window.location.href = response.url;
      return false;
    }

    return response.ok;
  } catch {
    // Network or CORS issue, ignore in offline state
    return true;
  }
}
