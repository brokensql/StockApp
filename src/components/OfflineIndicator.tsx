import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-banner-alert"
      role="status"
      aria-live="polite"
      className="fixed top-3 left-0 right-0 mx-auto z-50 w-fit flex items-center gap-2 rounded-full bg-[#252825]/95 text-white px-3.5 py-1.5 text-[12px] font-medium shadow-lg backdrop-blur-sm border border-white/10"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
      </span>
      <WifiOff size={13} className="text-amber-400 flex-shrink-0" />
      <span>No internet</span>
    </div>
  );
};
