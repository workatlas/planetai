import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/90 backdrop-blur-md px-3.5 py-2.5 text-xs font-medium text-amber-100 shadow-lg"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Offline Mode — Viewing cached job feed</span>
    </div>
  );
};
