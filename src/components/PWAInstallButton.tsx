import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'banner' | 'button';
  onDismiss?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  onDismiss,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // If already installed or user dismissed banner, don't show
  if (isInstalled || isDismissed) {
    return null;
  }

  // Not installable on current browser and not iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    await install();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (variant === 'banner') {
    return (
      <>
        <div
          id="pwa-install-banner"
          className="mx-4 my-2 p-3 bg-[#F0F5F2] border border-[#DEE3DE] rounded-2xl flex items-center justify-between gap-3 text-left shadow-xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#DEE3DE] overflow-hidden flex items-center justify-center flex-shrink-0 shadow-xs p-0.5">
              <img
                src="/icon_152.png"
                alt="StockApp Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] font-semibold text-[#252825] leading-snug truncate">
                Install StockApp for Offline Use
              </h4>
              <p className="text-[11px] text-[#6E746F] leading-tight">
                Add to your home screen for quick offline access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg bg-[#4F8065] text-white text-[12px] font-semibold hover:bg-[#3E6751] active:scale-95 transition-all cursor-pointer"
            >
              {isIOS ? 'Instructions' : 'Install'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-[#6E746F] hover:text-[#252825] rounded-md transition-colors cursor-pointer"
              aria-label="Dismiss install banner"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* iOS Step-by-Step Modal Guide */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#DEE3DE] text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#DEE3DE] overflow-hidden flex items-center justify-center flex-shrink-0 p-0.5 shadow-2xs">
                    <img
                      src="/icon_152.png"
                      alt="StockApp Logo"
                      className="w-full h-full object-contain rounded-md"
                    />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#252825]">
                    Install on iPhone / iPad
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-[#6E746F] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-[13px] text-[#424743] mb-5">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F9F7]">
                  <Share2 size={18} className="text-[#4F8065] mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>1.</strong> Tap the <strong>Share</strong> icon in the Safari navigation bar at the bottom.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F9F7]">
                  <PlusSquare size={18} className="text-[#4F8065] mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>2.</strong> Scroll down and select <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#4F8065] text-white text-[13px] font-semibold hover:bg-[#3E6751] active:scale-98 transition-all cursor-pointer text-center"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        id="btn-pwa-install"
        onClick={handleInstallClick}
        className="h-9 px-3 rounded-full bg-[#F0F5F2] hover:bg-[#E2EBE5] text-[#252825] border border-[#DEE3DE] text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
        title="Install StockApp to Home Screen"
      >
        <Download size={14} className="text-[#4F8065]" />
        <span>Install App</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#DEE3DE] text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-[#DEE3DE] overflow-hidden flex items-center justify-center flex-shrink-0 p-0.5 shadow-2xs">
                  <img
                    src="/icon_152.png"
                    alt="StockApp Logo"
                    className="w-full h-full object-contain rounded-md"
                  />
                </div>
                <h3 className="text-[16px] font-bold text-[#252825]">
                  Install on iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-[#6E746F] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-[13px] text-[#424743] mb-5">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F9F7]">
                <Share2 size={18} className="text-[#4F8065] mt-0.5 flex-shrink-0" />
                <p>
                  <strong>1.</strong> Tap the <strong>Share</strong> icon in the Safari navigation bar at the bottom.
                </p>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F7F9F7]">
                <PlusSquare size={18} className="text-[#4F8065] mt-0.5 flex-shrink-0" />
                <p>
                  <strong>2.</strong> Scroll down and select <strong>Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#4F8065] text-white text-[13px] font-semibold hover:bg-[#3E6751] active:scale-98 transition-all cursor-pointer text-center"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
