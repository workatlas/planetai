import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
}

interface PWAInstallContextValue {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  install: () => Promise<boolean>;
}

const PWAInstallContext = createContext<PWAInstallContextValue | null>(null);

export function PWAInstallProvider({children}: {children: React.ReactNode}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const syncInstalledState = () => {
      const standalone = displayMode.matches ||
        (window.navigator as unknown as {standalone?: boolean}).standalone === true;
      setIsInstalled(standalone);
    };

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));
    syncInstalledState();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    displayMode.addEventListener?.('change', syncInstalledState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      displayMode.removeEventListener?.('change', syncInstalledState);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    const promptEvent = deferredPrompt;
    await promptEvent.prompt();
    const {outcome} = await promptEvent.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  const value = useMemo(() => ({
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  }), [deferredPrompt, isInstalled, isIOS]);

  return <PWAInstallContext.Provider value={value}>{children}</PWAInstallContext.Provider>;
}

export function usePWAInstall() {
  const context = useContext(PWAInstallContext);
  if (!context) throw new Error('usePWAInstall must be used within PWAInstallProvider');
  return context;
}
