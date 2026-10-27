import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable ? (
        <button
          type="button"
          onClick={install}
          className="flex items-center gap-2 rounded-lg bg-[#6366F1] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#131722] px-3 py-2 text-xs font-medium text-slate-200 hover:border-indigo-500/50 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>{isIOS ? 'Install on iOS' : 'Android / PWA App'}</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#11141E] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 id="pwa-modal-title" className="text-base font-semibold text-white">
                Install as Android / Desktop PWA
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close PWA installation guide"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                This platform includes a compliant Web App Manifest, 192px/512px maskable icons, and an active Workbox service worker for standalone Android and desktop installation.
              </p>
              <div className="rounded-xl border border-slate-800 bg-[#0B0D13] p-3.5 space-y-2 text-xs text-slate-300">
                <p className="font-semibold text-indigo-300">Android (Chrome / Edge / Brave):</p>
                <p>1. Open the browser menu (three dots) in the top-right corner.</p>
                <p>2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong> to launch in standalone full-screen mode.</p>
                <p className="font-semibold text-indigo-300 pt-2">iOS Safari (iPhone / iPad):</p>
                <p>1. Tap the <strong>Share</strong> button in the bottom toolbar.</p>
                <p>2. Select <strong>Add to Home Screen</strong>.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg bg-[#6366F1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4F46E5] cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/90 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-400" />
      <span>Offline Mode — Viewing cached data.</span>
    </div>
  );
};
