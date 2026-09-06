import React, { useState } from 'react';
import { Shield, Lock, Check, Sparkles, HeartHandshake } from 'lucide-react';
import { AuraLogo } from './AuraLogo';
import { motion, AnimatePresence } from 'motion/react';

interface AgeGateModalProps {
  onVerifyAge: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({ onVerifyAge }) => {
  const [agreed, setAgreed] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleConfirm = () => {
    if (!agreed) return;
    setIsVerifying(true);
    setTimeout(() => {
      setIsDone(true);
      setTimeout(() => {
        onVerifyAge();
      }, 400);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060a]/95 backdrop-blur-2xl p-4 md:p-8 overflow-y-auto custom-scrollbar">
      {/* Background Animated Gradient Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-float-orb-1" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[30rem] h-[30rem] bg-fuchsia-600/15 rounded-full blur-[140px] pointer-events-none animate-float-orb-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-600/10 rounded-full blur-[110px] pointer-events-none" />

      {/* Main Container: Mobile Card / Desktop Split Showcase */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md md:max-w-3xl aura-glass-card rounded-[32px] p-6 sm:p-8 md:p-10 relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.7)] my-auto"
      >
        {/* Subtle Glass Reflection Line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column (Brand Showcase on Desktop, Header on Mobile) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-3 md:border-r md:border-white/10 md:pr-8">
            <AuraLogo size={140} showText={false} badge={true} />
            
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-purple-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                AURA
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 border border-fuchsia-500/30 text-[11px] font-extrabold tracking-widest text-fuchsia-300 uppercase">
                <Sparkles className="w-3 h-3 text-fuchsia-400" />
                <span>TYLKO 18+</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs">
              Ekskluzywna sieć dla dorosłych gejów i osób queer. Prawdziwe relacje, momenty i czat na żywo.
            </p>
          </div>

          {/* Right Column (Verification Form) */}
          <div className="md:col-span-7 space-y-6 text-left">
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <Shield className="w-5 h-5 text-fuchsia-400" />
                <span>Potwierdzenie Wieku</span>
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                Potwierdź, że masz co najmniej 18 lat, aby kontynuować.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Lock className="w-3.5 h-3.5 text-purple-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-200">Prywatność i Bezpieczeństwo</div>
                  <div className="text-[10px] text-slate-400">Szyfrowana przestrzeń</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-3.5 h-3.5 text-cyan-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-200">Zweryfikowana Społeczność</div>
                  <div className="text-[10px] text-slate-400">Autentyczni użytkownicy</div>
                </div>
              </div>
            </div>

            {/* Checkbox Selector */}
            <label
              onClick={() => setAgreed(!agreed)}
              className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                agreed
                  ? 'border-fuchsia-500/60 bg-fuchsia-950/20 shadow-[0_0_20px_rgba(217,70,239,0.15)]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-300 shrink-0 mt-0.5 ${
                  agreed
                    ? 'bg-gradient-to-tr from-purple-600 to-fuchsia-500 border-fuchsia-400 shadow-md shadow-fuchsia-500/40'
                    : 'border-white/30 bg-black/40'
                }`}
              >
                {agreed && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </div>
              <div className="text-xs text-slate-200 leading-snug">
                <span className="font-bold text-white block">Mam ukończone 18 lat</span>
                <span className="text-[11px] text-slate-400">Akceptuję wytyczne społeczności i warunki bezpieczeństwa dla dorosłych.</span>
              </div>
            </label>

            {/* Primary Action CTA */}
            <button
              onClick={handleConfirm}
              disabled={!agreed || isVerifying}
              className="w-full relative py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 bg-[length:200%_auto] text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-purple-950/60 hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed animate-breathe-glow overflow-hidden group"
            >
              {/* Shimmer sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer-pass" />

              <span className="relative z-10 flex items-center justify-center gap-2">
                {isDone ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                    <span>Wiek Potwierdzony!</span>
                  </>
                ) : isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Weryfikacja Dostępu...</span>
                  </>
                ) : (
                  <>
                    <span>Wejdź do sieci AURA</span>
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

