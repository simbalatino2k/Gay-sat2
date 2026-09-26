import React, { useEffect, useState } from 'react';
import { Zap, Sparkles, Rocket, Radio, Flame, Check, X } from 'lucide-react';

interface ProfileBoostOverlayProps {
  onClose: () => void;
  boostExpiresAt?: string;
  durationMinutes?: number;
}

export const ProfileBoostOverlay: React.FC<ProfileBoostOverlayProps> = ({
  onClose,
  boostExpiresAt,
  durationMinutes = 60
}) => {
  const [stage, setStage] = useState<'igniting' | 'active'>('igniting');
  const [particles, setParticles] = useState<Array<{ id: number; left: number; top: number; delay: number; size: number }>>([]);

  useEffect(() => {
    // Generate glowing floating particles
    const generated = Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2,
      size: Math.random() * 6 + 3
    }));
    setParticles(generated);

    // Transition from ignition shockwave to active state
    const t = setTimeout(() => {
      setStage('active');
    }, 700);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden pointer-events-auto select-none">
      {/* Dynamic backdrop with cosmic aura glow */}
      <div
        className="absolute inset-0 bg-[#060814]/90 backdrop-blur-xl transition-opacity duration-700 animate-in fade-in"
        onClick={onClose}
      />

      {/* Radiant Shockwave Ripple Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full border border-amber-400/40 animate-ping opacity-60 duration-1000" />
        <div className="w-[450px] h-[450px] sm:w-[650px] sm:h-[650px] rounded-full border border-fuchsia-500/30 animate-pulse opacity-40 duration-700" />
        <div className="w-[600px] h-[600px] sm:w-[850px] sm:h-[850px] rounded-full bg-gradient-to-r from-amber-500/10 via-fuchsia-600/10 to-cyan-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Floating Sparkle Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`
            }}
            className="absolute rounded-full bg-gradient-to-r from-amber-300 via-fuchsia-300 to-cyan-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-float-orb-1 opacity-70"
          />
        ))}
      </div>

      {/* Central Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-amber-400/40 bg-gradient-to-b from-[#141226]/95 via-[#0e101f]/95 to-[#090b16]/98 p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.35),0_0_80px_rgba(217,70,239,0.2)] animate-in zoom-in-95 duration-500">
        {/* Shimmer sweep effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/10 to-transparent -translate-x-full animate-shimmer-pass pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Central Pulsing Rocket & Lightning Beacon */}
        <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
          {/* Rotating gradient halo */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 blur-lg opacity-70 animate-spin-slow" />

          {/* Glowing core badge */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.6)]">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0c0e1c]">
              <Rocket className="h-10 w-10 text-amber-300 stroke-[2.2] animate-bounce drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
            </div>
          </div>

          {/* Sparkle indicators */}
          <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-300 animate-pulse" />
          <Zap className="absolute -bottom-1 -left-1 h-5 w-5 text-fuchsia-400 animate-pulse" />
        </div>

        {/* Header Title & Tagline */}
        <div className="space-y-1.5 mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] font-black tracking-wider uppercase shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span>Profile Boost Active</span>
          </div>

          <h3 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            <span className="bg-gradient-to-r from-amber-200 via-rose-200 to-purple-200 bg-clip-text text-transparent drop-shadow-sm">
              Twój profil jest na szczycie!
            </span>
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
            Przez najbliższą <strong className="text-amber-300 font-extrabold">{durationMinutes} minut</strong> Twój profil zyskuje priorytetową widoczność w widoku Discover i radarze w okolicy.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 text-left">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            <Flame className="w-4 h-4 text-amber-400 mb-1" />
            <div className="text-[11px] font-black text-white">Do 10x</div>
            <div className="text-[9.5px] text-slate-400 leading-tight">Więcej wyświetleń</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            <Radio className="w-4 h-4 text-fuchsia-400 mb-1" />
            <div className="text-[11px] font-black text-white">Top Radar</div>
            <div className="text-[9.5px] text-slate-400 leading-tight">Pierwsze miejsce</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-400 mb-1" />
            <div className="text-[11px] font-black text-white">Aura Glow</div>
            <div className="text-[9.5px] text-slate-400 leading-tight">Złoty blask</div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          type="button"
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:via-rose-400 hover:to-purple-500 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
        >
          <Check className="w-4 h-4 text-white group-hover:scale-110 transition-transform stroke-[2.5]" />
          <span>Świetnie, rozumiem!</span>
        </button>
      </div>
    </div>
  );
};
export default ProfileBoostOverlay;
