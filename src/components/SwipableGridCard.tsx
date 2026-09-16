import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Heart, X } from 'lucide-react';
import { UserProfile, TapType } from '../types';
import { ProfileAuraFrame } from './ProfileAuraFrame';
import { formatDistance } from '../utils/formatDistance';

interface SwipableGridCardProps {
  profile: UserProfile;
  onSelect: () => void;
  onLike: (profile: UserProfile) => void;
  onPass: (profile: UserProfile) => void;
  activeTapMenuUserId: string | null;
  setActiveTapMenuUserId: React.Dispatch<React.SetStateAction<string | null>>;
  tapSuccessFeedback: { [userId: string]: string };
  handleSendQuickTap: (e: React.MouseEvent, targetUserId: string, tapType: TapType) => void;
}

export const SwipableGridCard: React.FC<SwipableGridCardProps> = ({
  profile: p,
  onSelect,
  onLike,
  onPass,
  activeTapMenuUserId,
  setActiveTapMenuUserId,
  tapSuccessFeedback,
  handleSendQuickTap
}) => {
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const triggerHaptic = (ms = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  };

  return (
    <motion.div
      layout
      animate={
        exitDirection === 'right'
          ? { x: 450, opacity: 0, rotate: 18, transition: { duration: 0.22 } }
          : exitDirection === 'left'
          ? { x: -450, opacity: 0, rotate: -18, transition: { duration: 0.22 } }
          : { opacity: 1, scale: 1 }
      }
      initial={{ opacity: 0, scale: 0.9 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.25, type: 'spring', bounce: 0.2 }}
      className="w-full h-full relative select-none"
    >
      <ProfileAuraFrame
        isOnline={p.isOnline}
        onClick={() => {
          if (!exitDirection) {
            onSelect();
          }
        }}
        className="aspect-[3/4] rounded-[24px] group transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.985] shadow-xl shadow-black/70 h-full w-full relative overflow-hidden"
        innerClassName="aura-glass-card border border-white/[0.08]"
      >
        <img
          src={p.photos[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
          alt={p.displayName}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 pointer-events-none"
        />

        {/* Soft Top Vignette */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Top Bar Indicators */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
          {/* Role Badge */}
          <span className="bg-black/65 backdrop-blur-md text-fuchsia-300 text-[9px] font-black px-2.5 py-0.5 rounded-full border border-fuchsia-500/35 shadow-md tracking-wider uppercase">
            {p.identityRole}
          </span>

          {/* Online Indicator */}
          <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-md">
            <span className={`w-1.5 h-1.5 rounded-full ${p.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-[8.5px] font-extrabold text-slate-200 tracking-wider">
              {p.isOnline ? 'LIVE' : `${p.lastActiveMinutesAgo || 12}m`}
            </span>
          </div>
        </div>

        {/* Quick Tap Feedback Floating Badge */}
        {tapSuccessFeedback[p.userId] && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
            <div className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 border border-white/20 text-white font-black text-xs shadow-2xl tracking-wide flex items-center gap-1.5 animate-bounce">
              <span>{tapSuccessFeedback[p.userId]}</span>
            </div>
          </div>
        )}

        {/* Quick Tap Menu Overlay */}
        {activeTapMenuUserId === p.userId && (
          <div
            onClick={e => e.stopPropagation()}
            className="absolute inset-x-2 bottom-14 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-2 z-30 shadow-2xl flex items-center justify-around gap-1 animate-in zoom-in-95 duration-150"
          >
            {[
              { type: 'HOT' as const, emoji: '🔥', label: 'Hot' },
              { type: 'WOOF' as const, emoji: '🐾', label: 'Woof' },
              { type: 'BOLT' as const, emoji: '⚡', label: 'Bolt' },
              { type: 'WAVE' as const, emoji: '👋', label: 'Wave' },
            ].map(t => (
              <button
                key={t.type}
                type="button"
                onClick={e => handleSendQuickTap(e, p.userId, t.type)}
                className="flex flex-col items-center p-1.5 rounded-xl hover:bg-white/15 transition active:scale-90"
                title={`Wyślij ${t.label}`}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="text-[8.5px] font-extrabold text-slate-200 mt-0.5">{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Cinematic Bottom Fade Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06070c] via-[#06070c]/80 via-45% to-transparent p-3 pt-12 space-y-1 z-10">
          <div className="flex items-center justify-between gap-1 overflow-hidden">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="text-sm font-black text-white tracking-tight drop-shadow-sm truncate">
                {p.displayName}, {p.age}
              </span>
              {p.verified && (
                <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.35)] shrink-0" title="Verified">
                  <ShieldCheck className="w-3 h-3 stroke-[2.4]" />
                </span>
              )}
            </div>

            {/* Quick Tap Trigger Button */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setActiveTapMenuUserId(prev => prev === p.userId ? null : p.userId);
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all active:scale-90 shrink-0 ${
                activeTapMenuUserId === p.userId
                  ? 'bg-fuchsia-500 border-white text-white shadow-[0_0_12px_rgba(217,70,239,0.8)]'
                  : 'bg-black/60 border-white/20 text-fuchsia-300 hover:bg-fuchsia-500/30 hover:border-fuchsia-400'
              }`}
              title="Szybka zaczepka (Quick Tap)"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
            <span className="truncate max-w-[95px] text-slate-300/90">{p.location || 'Nearby'}</span>
            <span className="text-fuchsia-300 font-bold bg-fuchsia-950/50 px-1.5 py-0.5 rounded-md border border-fuchsia-500/25 text-[9.5px] shrink-0">
              {formatDistance(p.distanceKm)}
            </span>
          </div>
        </div>
      </ProfileAuraFrame>
    </motion.div>
  );
};
