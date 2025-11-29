import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => void;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export const usePWAInstall = (): PWAInstallState => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Проверяем, установлено ли PWA
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkInstalled();

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Слушаем событие appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Периодическая проверка для iOS (где нет beforeinstallprompt)
    const checkiOSInstallability = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      if (isIOS && isSafari && !isInstalled) {
        // На iOS Safari показываем кнопку установки через 5 секунд
        setTimeout(() => {
          if (!isInstalled) {
            setIsInstallable(true);
          }
        }, 5000);
      }
    };

    checkiOSInstallability();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      // Для iOS показываем инструкции
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('Для установки приложения: \n1. Нажмите кнопку "Поделиться" в Safari\n2. Выберите "На экран Домой"\n3. Нажмите "Добавить"');
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA установлено');
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall,
    deferredPrompt
  };
};

export default usePWAInstall;
