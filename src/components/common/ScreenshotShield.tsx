import React from 'react';
import { ShieldAlert, ShieldCheck, EyeOff, Lock } from 'lucide-react';

interface ScreenshotShieldProps {
  isBlocked?: boolean;
  isWindowBlurred?: boolean;
  featureTitle?: string;
  onDismiss?: () => void;
  showWatermark?: boolean;
  watermarkText?: string;
  children?: React.ReactNode;
}

export const ScreenshotShield: React.FC<ScreenshotShieldProps> = ({
  isBlocked = false,
  isWindowBlurred = false,
  featureTitle = 'Protected Content',
  onDismiss,
  showWatermark = false,
  watermarkText = 'AURA 18+ SECURE',
  children
}) => {
  return (
    <div
      className="relative screenshot-shield select-none"
      onContextMenu={(e) => {
        // Prevent right-click to block "Save image as...", "Copy image", or inspection
        e.preventDefault();
        return false;
      }}
    >
      {/* Underlying Content */}
      <div
        className={`transition-all duration-200 ${
          isWindowBlurred
            ? 'filter blur-2xl opacity-10 pointer-events-none select-none'
            : isBlocked
            ? 'filter blur-md opacity-25 pointer-events-none select-none'
            : ''
        }`}
      >
        {children}
      </div>

      {/* Subtle Anti-Theft Watermark across protected media */}
      {showWatermark && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 flex items-center justify-center opacity-15"
        >
          <div className="transform -rotate-25 text-white/50 font-black tracking-widest text-xs whitespace-nowrap uppercase select-none">
            {watermarkText} · AURA PRIVACY SHIELD · {watermarkText}
          </div>
        </div>
      )}

      {/* Focus-Loss Privacy Curtain (Appears when user opens Snipping Tool or leaves window) */}
      {isWindowBlurred && (
        <div
          id="aura-privacy-curtain"
          className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-[#070913]/95 backdrop-blur-3xl animate-in fade-in duration-150"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-fuchsia-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center mb-4 shadow-[0_0_35px_rgba(6,182,212,0.3)] animate-pulse">
            <EyeOff className="w-8 h-8 text-cyan-300" />
          </div>

          <h3 className="text-base font-black text-white tracking-wide mb-1.5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-fuchsia-400" />
            <span>Ochrona Prywatności AURA</span>
          </h3>

          <p className="text-xs text-slate-300 max-w-xs leading-relaxed font-medium mb-2">
            Zawartość ({featureTitle}) została ukryta podczas utraty fokusu okna, aby uniemożliwić zrzuty ekranu i nagrywanie.
          </p>

          <span className="text-[10px] text-cyan-300/80 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full font-mono">
            Kliknij w okno aplikacji, aby kontynuować
          </span>
        </div>
      )}

      {/* Screenshot Attempt Warning Banner (Appears when PrintScreen or screenshot keys pressed) */}
      {isBlocked && (
        <div
          id="aura-screenshot-blocked-toast"
          className="fixed top-6 inset-x-4 max-w-md mx-auto z-[9999] pointer-events-auto animate-in slide-in-from-top-4 duration-300"
        >
          <div className="rounded-2xl bg-gradient-to-r from-rose-950/95 via-[#0e101f]/95 to-purple-950/95 border border-rose-500/60 p-4 shadow-[0_10px_40px_rgba(244,63,94,0.35)] backdrop-blur-2xl flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 animate-bounce" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-300 tracking-wide uppercase">
                  Zrzut ekranu zablokowany
                </span>
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/10"
                  >
                    Zamknij
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-200 leading-snug">
                Wykonywanie zrzutów ekranu, pobieranie zdjęć oraz kopiowanie wiadomości z <strong>{featureTitle}</strong> jest surowo zabronione zgodnie z polityką prywatności AURA.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Schowek został wyczyszczony. Twoja prywatność jest chroniona.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
