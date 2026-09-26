import React from 'react';
import { ShieldCheck, Sparkles, Check, Info } from 'lucide-react';

export type VerifiedBadgeTier = 'standard' | 'elite' | 'pro';

interface AuraVerifiedBadgeProps {
  verified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'icon-only' | 'card' | 'interactive';
  customLabel?: string;
  onClick?: () => void;
  className?: string;
  showTooltip?: boolean;
}

export const AuraVerifiedBadge: React.FC<AuraVerifiedBadgeProps> = ({
  verified = true,
  size = 'md',
  variant = 'pill',
  customLabel,
  onClick,
  className = '',
  showTooltip = false
}) => {
  if (!verified) return null;

  // Sizing definitions
  const sizeClasses = {
    sm: {
      pill: 'text-[9px] px-2 py-0.5 gap-1',
      icon: 'w-3 h-3',
      sparkle: 'w-2 h-2',
      glow: 'shadow-[0_0_8px_rgba(6,182,212,0.45)]'
    },
    md: {
      pill: 'text-[10.5px] px-2.5 py-0.5 gap-1.5',
      icon: 'w-3.5 h-3.5',
      sparkle: 'w-2.5 h-2.5',
      glow: 'shadow-[0_0_12px_rgba(6,182,212,0.5),0_0_24px_rgba(168,85,247,0.3)]'
    },
    lg: {
      pill: 'text-xs px-3.5 py-1.5 gap-2',
      icon: 'w-4.5 h-4.5',
      sparkle: 'w-3 h-3',
      glow: 'shadow-[0_0_18px_rgba(6,182,212,0.65),0_0_30px_rgba(168,85,247,0.45)]'
    }
  }[size];

  // Icon-only representation with glowing aura ring
  if (variant === 'icon-only') {
    return (
      <span
        onClick={onClick}
        title="Aura Verified · Profil zweryfikowany 18+"
        className={`relative inline-flex items-center justify-center shrink-0 cursor-default group ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
      >
        {/* Ambient radial pulse */}
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/30 to-purple-500/40 blur-sm opacity-75 group-hover:opacity-100 transition-opacity animate-pulse" />

        {/* Core glowing badge disc */}
        <span className="relative flex items-center justify-center p-1 rounded-full bg-gradient-to-br from-cyan-400/25 via-[#0e101f] to-purple-600/30 border border-cyan-400/70 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.55)]">
          <ShieldCheck className={`${sizeClasses.icon} stroke-[2.4] text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]`} />
        </span>
      </span>
    );
  }

  // Interactive full banner/card representation (e.g. at the top of ProfileEditor)
  if (variant === 'card') {
    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden rounded-[22px] border border-cyan-500/35 bg-gradient-to-r from-cyan-950/40 via-[#0d1020]/90 to-purple-950/40 p-3.5 shadow-[0_0_25px_rgba(6,182,212,0.18)] transition-all ${
          onClick ? 'cursor-pointer hover:border-cyan-400/60 active:scale-[0.99]' : ''
        } ${className}`}
      >
        {/* Dynamic sweeping shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full animate-shimmer-pass pointer-events-none" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Glowing animated badge orb */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400/20 via-purple-600/20 to-fuchsia-500/20 border border-cyan-400/50 shadow-[0_0_16px_rgba(6,182,212,0.4)] shrink-0">
              <ShieldCheck className="w-5 h-5 text-cyan-300 stroke-[2.4] drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black tracking-wide bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent drop-shadow-sm">
                  Aura Verified Member
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[9px] font-extrabold text-cyan-300 uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-300" />
                  Aktywna
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Profil posiada oficjalną odznakę autentyczności i weryfikacji wieku 18+. Twoje konto wyróżnia się na radarze i w widoku odkrywania.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default 'pill' badge with dynamic glow and metallic borders
  return (
    <span
      onClick={onClick}
      className={`relative inline-flex items-center font-bold tracking-tight rounded-full transition-all group overflow-hidden ${
        sizeClasses.pill
      } ${sizeClasses.glow} ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
      } bg-gradient-to-r from-cyan-950/80 via-[#0e1222] to-purple-950/80 border border-cyan-400/50 text-cyan-200 ${className}`}
    >
      {/* Dynamic ambient sweep */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

      {/* Pulsing beacon glow indicator */}
      <span className="relative flex items-center justify-center shrink-0">
        <ShieldCheck className={`${sizeClasses.icon} text-cyan-300 stroke-[2.4] drop-shadow-[0_0_6px_rgba(6,182,212,0.9)]`} />
      </span>

      <span className="relative font-extrabold tracking-wide uppercase text-cyan-100 flex items-center gap-1 drop-shadow-sm">
        <span>{customLabel || 'Aura Verified'}</span>
        <Sparkles className={`${sizeClasses.sparkle} text-cyan-300 animate-pulse`} />
      </span>
    </span>
  );
};

export default AuraVerifiedBadge;
