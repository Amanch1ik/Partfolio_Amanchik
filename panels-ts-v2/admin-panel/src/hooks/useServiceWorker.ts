import { useState, useEffect } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isActive: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export const useServiceWorker = () => {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isActive: false,
    updateAvailable: false,
    registration: null
  });

  useEffect(() => {
    if (!swState.isSupported) return;
    
    // Не регистрируем Service Worker в режиме разработки
    if (import.meta.env.DEV) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        setSwState(prev => ({
          ...prev,
          isRegistered: true,
          registration
        }));

        // Отслеживаем состояние service worker
        const updateState = () => {
          const { installing, waiting, active } = registration;

          setSwState(prev => ({
            ...prev,
            isInstalling: !!installing,
            isWaiting: !!waiting,
            isActive: !!active,
            updateAvailable: !!waiting
          }));
        };

        // Слушаем изменения состояния
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              updateState();
            });
          }
          updateState();
        });

        // Проверяем обновления каждые 60 минут
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        updateState();

      } catch (error) {
        console.error('SW registration failed:', error);
      }
    };

    registerSW();
  }, [swState.isSupported]);

  const updateServiceWorker = () => {
    if (swState.registration?.waiting) {
      // Отправляем сообщение service worker для активации
      swState.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const checkForUpdates = () => {
    if (swState.registration) {
      swState.registration.update();
    }
  };

  return {
    ...swState,
    updateServiceWorker,
    checkForUpdates
  };
};

export default useServiceWorker;
