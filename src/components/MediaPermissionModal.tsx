import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Mic,
  Video,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Lock,
  ExternalLink
} from 'lucide-react';
import { useMediaPermissions, PermissionState } from '../hooks/useMediaPermissions';

export interface MediaPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGranted?: () => void;
  requiredPermissions?: ('camera' | 'microphone')[];
  title?: string;
  description?: string;
  callTargetName?: string;
}

export const MediaPermissionModal: React.FC<MediaPermissionModalProps> = ({
  isOpen,
  onClose,
  onGranted,
  requiredPermissions = ['camera', 'microphone'],
  title = 'Wymagane uprawnienia do wideorozmowy',
  description,
  callTargetName
}) => {
  const {
    camera,
    microphone,
    isChecking,
    isRequesting,
    hasAllPermissions,
    error,
    checkPermissions,
    requestPermissions,
    resetError
  } = useMediaPermissions();

  const [hasPrompted, setHasPrompted] = useState(false);

  // Check current permissions whenever modal opens
  useEffect(() => {
    if (isOpen) {
      resetError();
      checkPermissions();
    }
  }, [isOpen, checkPermissions, resetError]);

  // If user grants all required permissions while modal is open, trigger onGranted callback
  useEffect(() => {
    const isCameraNeeded = requiredPermissions.includes('camera');
    const isMicNeeded = requiredPermissions.includes('microphone');

    const cameraOk = !isCameraNeeded || camera === 'granted';
    const micOk = !isMicNeeded || microphone === 'granted';

    if (isOpen && cameraOk && micOk && (hasPrompted || hasAllPermissions)) {
      const timer = setTimeout(() => {
        onGranted?.();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, camera, microphone, requiredPermissions, hasPrompted, hasAllPermissions, onGranted]);

  if (!isOpen) return null;

  const isCameraNeeded = requiredPermissions.includes('camera');
  const isMicNeeded = requiredPermissions.includes('microphone');

  const hasAnyDenied =
    (isCameraNeeded && camera === 'denied') ||
    (isMicNeeded && microphone === 'denied');

  const handleGrantAccess = async () => {
    setHasPrompted(true);
    const result = await requestPermissions(requiredPermissions);
    if (result.cameraGranted && result.microphoneGranted) {
      onGranted?.();
    }
  };

  const handleRetryCheck = async () => {
    const res = await checkPermissions();
    const cameraOk = !isCameraNeeded || res.camera === 'granted';
    const micOk = !isMicNeeded || res.microphone === 'granted';

    if (cameraOk && micOk) {
      onGranted?.();
    }
  };

  const getStatusBadge = (state: PermissionState) => {
    switch (state) {
      case 'granted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Zezwolono
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" />
            Zablokowano
          </span>
        );
      case 'unsupported':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            <AlertTriangle className="w-3 h-3 text-slate-400" />
            Brak wsparcia
          </span>
        );
      case 'prompt':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Wymagane
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      <div
        id="media-permission-modal-overlay"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-permission-modal-title"
      >
        <motion.div
          id="media-permission-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-[#090b14]/95 border border-purple-500/30 rounded-3xl p-6 shadow-2xl shadow-purple-950/60 overflow-hidden text-white"
        >
          {/* Subtle decorative background gradient */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            id="btn-close-media-permission-modal"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white transition active:scale-95 border border-white/10"
            aria-label="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3.5 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-fuchsia-600/30 border border-purple-500/40 flex items-center justify-center text-fuchsia-400 shadow-lg shadow-purple-950/50 shrink-0">
              {hasAnyDenied ? (
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              ) : (
                <Video className="w-6 h-6 text-fuchsia-400" />
              )}
            </div>
            <div className="pr-6">
              <h2
                id="media-permission-modal-title"
                className="text-base font-bold text-white leading-snug"
              >
                {title}
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {description ||
                  (callTargetName
                    ? `Przed połączeniem z ${callTargetName} konieczne jest zezwolenie na transmisję audio i wideo WebRTC.`
                    : 'AURA 18+ wymaga bezpośredniego dostępu do urządzeń multimedialnych dla bezpiecznego, szyfrowanego połączenia 1:1.')}
              </p>
            </div>
          </div>

          {/* Permissions Status List */}
          <div className="space-y-2.5 mb-5">
            {/* Camera Permission Card */}
            {isCameraNeeded && (
              <div
                id="card-permission-camera"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Aparat (Wideo)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Do przesyłania obrazu w czasie rzeczywistym
                    </span>
                  </div>
                </div>
                <div>{getStatusBadge(camera)}</div>
              </div>
            )}

            {/* Microphone Permission Card */}
            {isMicNeeded && (
              <div
                id="card-permission-microphone"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Mikrofon (Audio)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Do dwukierunkowej transmisji głosu
                    </span>
                  </div>
                </div>
                <div>{getStatusBadge(microphone)}</div>
              </div>
            )}
          </div>

          {/* Error Banner if any */}
          {error && (
            <div
              id="media-permission-error-banner"
              className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 mb-4 flex items-start gap-2.5 text-xs text-rose-300"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Instruction Box if Permission is Denied */}
          {hasAnyDenied && (
            <div
              id="media-permission-denied-instructions"
              className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-5 space-y-2 text-xs text-amber-200"
            >
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Lock className="w-3.5 h-3.5" />
                <span>Uprawnienia zostały zablokowane w przeglądarce</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Aby odblokować kamerę lub mikrofon:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-amber-200/80 space-y-1 pl-1">
                <li>Kliknij ikonę kłódki 🔒 lub ustawień obok paska adresu.</li>
                <li>Zmień „Aparat” i „Mikrofon” na stan <strong>Zezwalaj</strong>.</li>
                <li>Kliknij przycisk „Sprawdź ponownie” poniżej.</li>
              </ol>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            {hasAnyDenied ? (
              <button
                id="btn-retry-media-permissions"
                type="button"
                onClick={handleRetryCheck}
                disabled={isChecking}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Sprawdzanie uprawnień...' : 'Sprawdź ponownie'}</span>
              </button>
            ) : (
              <button
                id="btn-grant-media-permissions"
                type="button"
                onClick={handleGrantAccess}
                disabled={isRequesting || isChecking}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition active:scale-[0.98] disabled:opacity-50"
              >
                {isRequesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Oczekiwanie na zgodę...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Zezwól na dostęp</span>
                  </>
                )}
              </button>
            )}

            <button
              id="btn-cancel-media-permissions"
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition active:scale-[0.98]"
            >
              Anuluj połączenie
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
