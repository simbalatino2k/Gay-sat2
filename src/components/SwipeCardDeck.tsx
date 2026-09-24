import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  X,
  Star,
  RotateCcw,
  Info,
  Zap,
  Sparkles,
  ShieldCheck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Flame,
  Rocket
} from 'lucide-react';
import { UserProfile, UserAccount, TapType } from '../types';
import { formatDistance } from '../utils/formatDistance';
import { AuraVerifiedBadge } from './common/AuraVerifiedBadge';

interface SwipeCardDeckProps {
  profiles: UserProfile[];
  authToken: string;
  currentUser?: UserAccount | null;
  onLikeProfile: (profile: UserProfile) => void;
  onOpenChat: (userId: string) => void;
  onSelectProfileDetails: (profile: UserProfile) => void;
  onResetFilters?: () => void;
}

interface SwipedHistoryItem {
  profile: UserProfile;
  action: 'like' | 'pass' | 'superlike';
}

export const SwipeCardDeck: React.FC<SwipeCardDeckProps> = ({
  profiles,
  authToken,
  currentUser,
  onLikeProfile,
  onOpenChat,
  onSelectProfileDetails,
  onResetFilters
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<SwipedHistoryItem[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | null>(null);

  // Quick Tap Menu State
  const [showTapMenu, setShowTapMenu] = useState(false);
  const [tapSuccessFeedback, setTapSuccessFeedback] = useState<string | null>(null);

  // Match Celebration Modal
  const [matchedProfile, setMatchedProfile] = useState<UserProfile | null>(null);

  const currentProfile = profiles[currentIndex] as UserProfile | undefined;
  const nextProfile = profiles[currentIndex + 1] as UserProfile | undefined;
  const thirdProfile = profiles[currentIndex + 2] as UserProfile | undefined;

  // Reset photo index when card changes
  useEffect(() => {
    setActivePhotoIndex(0);
    setShowTapMenu(false);
    setExitDirection(null);
  }, [currentIndex]);

  // Haptic feedback trigger
  const triggerHaptic = (duration = 20) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignore vibration errors
      }
    }
  };

  // Perform API like
  const sendLikeApi = async (targetUserId: string, isSuperLike = false) => {
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ targetUserId, isSuperLike })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.isMatch) {
          triggerHaptic(50);
          if (currentProfile) {
            setMatchedProfile(currentProfile);
          }
        }
      }
    } catch (err) {
      console.warn('Like API notice:', err);
    }
  };

  // Handle Swipe Actions
  const handleSwipe = (direction: 'left' | 'right' | 'up') => {
    if (!currentProfile) return;

    triggerHaptic(25);
    setExitDirection(direction);

    // Record history for Undo
    const action = direction === 'right' ? 'like' : direction === 'up' ? 'superlike' : 'pass';
    setHistory(prev => [...prev, { profile: currentProfile, action }]);

    if (direction === 'right') {
      onLikeProfile(currentProfile);
      sendLikeApi(currentProfile.userId, false);
    } else if (direction === 'up') {
      onLikeProfile(currentProfile);
      sendLikeApi(currentProfile.userId, true);
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 200);
  };

  // Handle Undo / Rewind
  const handleUndo = () => {
    if (history.length === 0 || currentIndex === 0) return;
    triggerHaptic(30);
    const lastItem = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (matchedProfile) return;

      if (e.key === 'ArrowRight') {
        handleSwipe('right');
      } else if (e.key === 'ArrowLeft') {
        handleSwipe('left');
      } else if (e.key === 'ArrowUp') {
        handleSwipe('up');
      } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
        handleUndo();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (currentProfile) {
          e.preventDefault();
          onSelectProfileDetails(currentProfile);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentProfile, history.length, matchedProfile]);

  // Quick Taps handler
  const handleSendTap = async (tapType: TapType) => {
    if (!currentProfile) return;
    try {
      const res = await fetch('/api/taps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ targetUserId: currentProfile.userId, tapType })
      });
      if (res.ok) {
        const labels: Record<TapType, string> = {
          HOT: '🔥 Wysłano Hot!',
          WOOF: '🐾 Wysłano Woof!',
          BOLT: '⚡ Wysłano Bolt!',
          WAVE: '👋 Pomachano!'
        };
        setTapSuccessFeedback(labels[tapType]);
        setShowTapMenu(false);
        setTimeout(() => setTapSuccessFeedback(null), 2500);
      }
    } catch (err) {
      console.warn('Tap error:', err);
    }
  };

  // Handle Photo Navigation inside card
  const handlePhotoNav = (direction: 'next' | 'prev', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProfile?.photos || currentProfile.photos.length <= 1) return;
    if (direction === 'next') {
      setActivePhotoIndex(prev => (prev + 1) % currentProfile.photos.length);
    } else {
      setActivePhotoIndex(prev => (prev - 1 + currentProfile.photos.length) % currentProfile.photos.length);
    }
  };

  // Stack is exhausted
  if (!currentProfile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto min-h-[520px] rounded-[32px] border border-white/10 bg-[#0b0d19]/80 backdrop-blur-2xl p-8 flex flex-col items-center justify-center text-center space-y-5 shadow-2xl my-4"
      >
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600/30 to-fuchsia-600/30 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 shadow-xl shadow-fuchsia-950/50">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-2 max-w-xs">
          <h3 className="text-lg font-black text-white tracking-wide">
            Przejrzano wszystkie profile
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sprawdź zaktualizowane filtry lub zacznij przeglądanie od początku, aby odkryć nowe osoby online w Twojej okolicy.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 w-full max-w-xs">
          <button
            type="button"
            onClick={() => setCurrentIndex(0)}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-xs font-black text-white shadow-lg shadow-purple-900/40 hover:brightness-110 active:scale-95 transition"
          >
            Przeglądaj od nowa
          </button>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 active:scale-95 transition"
            >
              Resetuj filtry
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  const currentPhotos = currentProfile.photos && currentProfile.photos.length > 0
    ? currentProfile.photos
    : [{ id: 'default-ph', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800', isPrimary: true }];

  const currentPhotoUrl = currentPhotos[activePhotoIndex]?.url || currentPhotos[0]?.url;

  return (
    <div className="w-full max-w-[420px] mx-auto relative select-none pb-8 pt-1">

      {/* Cards Stack Stage */}
      <div className="relative w-full aspect-[3/4.4] max-h-[620px]">

        {/* Third Background Card (Peek) */}
        {thirdProfile && (
          <div
            className="absolute inset-0 rounded-[30px] overflow-hidden border border-white/[0.04] bg-slate-900/60 pointer-events-none shadow-xl transition-all duration-300"
            style={{
              transform: 'scale(0.88) translateY(26px)',
              opacity: 0.45,
              zIndex: 1
            }}
          >
            <img
              src={thirdProfile.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
              alt=""
              draggable={false}
              className="w-full h-full object-cover filter blur-[1px] brightness-75 protected-image select-none"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}

        {/* Second Background Card */}
        {nextProfile && (
          <div
            className="absolute inset-0 rounded-[30px] overflow-hidden border border-white/[0.08] bg-slate-900/80 pointer-events-none shadow-2xl transition-all duration-300 protected-media-container select-none"
            style={{
              transform: 'scale(0.94) translateY(14px)',
              opacity: 0.75,
              zIndex: 2
            }}
          >
            <img
              src={nextProfile.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
              alt=""
              draggable={false}
              className="w-full h-full object-cover filter brightness-90 protected-image select-none"
              onContextMenu={(e) => e.preventDefault()}
            />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-end">
              <span className="text-sm font-bold text-white/80">{nextProfile.displayName}, {nextProfile.age}</span>
            </div>
          </div>
        )}

        {/* Active Top Card */}
        <motion.div
          key={currentProfile.id}
          animate={
            exitDirection === 'right'
              ? { x: 550, opacity: 0, rotate: 22, transition: { duration: 0.28 } }
              : exitDirection === 'left'
              ? { x: -550, opacity: 0, rotate: -22, transition: { duration: 0.28 } }
              : exitDirection === 'up'
              ? { y: -550, opacity: 0, scale: 1.05, transition: { duration: 0.28 } }
              : { x: 0, y: 0, rotate: 0, opacity: 1 }
          }
          className="absolute inset-0 rounded-[30px] overflow-hidden border border-white/15 bg-[#0a0c16] shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(217,70,239,0.15)] z-10 protected-media-container select-none"
          onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
        >
          {/* Main Photo */}
          <img
            src={currentPhotoUrl}
            alt={currentProfile.displayName}
            referrerPolicy="no-referrer"
            draggable={false}
            className="w-full h-full object-cover pointer-events-none protected-image select-none"
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Top Vignette Gradient */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Segmented Photo Story Indicators */}
          {currentPhotos.length > 1 && (
            <div className="absolute top-3 inset-x-4 flex items-center gap-1.5 z-20 pointer-events-none">
              {currentPhotos.map((_, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-1 rounded-full overflow-hidden bg-white/25 backdrop-blur-sm transition-all"
                >
                  <div
                    className={`h-full transition-all duration-200 ${
                      idx === activePhotoIndex
                        ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]'
                        : idx < activePhotoIndex
                        ? 'bg-white/70'
                        : 'bg-transparent'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Photo Tap Navigation Zones (Left & Right) */}
          {currentPhotos.length > 1 && (
            <>
              <div
                onClick={(e) => {
                  if (!isDragging) handlePhotoNav('prev', e);
                }}
                className="absolute inset-y-0 left-0 w-1/3 z-15 cursor-pointer"
                title="Poprzednie zdjęcie"
              />
              <div
                onClick={(e) => {
                  if (!isDragging) handlePhotoNav('next', e);
                }}
                className="absolute inset-y-0 right-0 w-2/3 z-15 cursor-pointer"
                title="Następne zdjęcie"
              />
            </>
          )}

          {/* Top Info Bar Badges */}
          <div className="absolute top-6 inset-x-4 flex items-center justify-between z-20 pointer-events-none">
            {/* Sexual Role Badge */}
            <span className="bg-black/70 backdrop-blur-md text-fuchsia-300 text-[10px] font-black px-3 py-1 rounded-full border border-fuchsia-500/40 shadow-lg tracking-wider uppercase">
              {currentProfile.identityRole}
            </span>

            {/* Online Badge */}
            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-lg">
              <span className={`w-2 h-2 rounded-full ${currentProfile.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[10px] font-black text-slate-200 tracking-wider">
                {currentProfile.isOnline ? 'ONLINE' : `${currentProfile.lastActiveMinutesAgo || 10}m temu`}
              </span>
            </div>
          </div>

          {/* Quick Tap Feedback Floating Notification */}
          {tapSuccessFeedback && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4 pointer-events-none animate-in zoom-in-95 duration-150">
              <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 border border-white/25 text-white font-black text-sm shadow-2xl tracking-wide flex items-center gap-2 animate-bounce">
                <span>{tapSuccessFeedback}</span>
              </div>
            </div>
          )}

          {/* Quick Taps Popover Menu */}
          {showTapMenu && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute inset-x-4 bottom-24 bg-black/92 backdrop-blur-xl border border-white/20 rounded-2xl p-2.5 z-40 shadow-2xl flex items-center justify-around gap-1.5 animate-in zoom-in-95 duration-150"
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
                  onClick={() => handleSendTap(t.type)}
                  className="flex flex-col items-center p-2 rounded-xl hover:bg-white/15 active:scale-90 transition"
                  title={`Wyślij ${t.label}`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-[9px] font-extrabold text-slate-200 mt-1">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Bottom Card Profile Content */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#05060d] via-[#05060d]/90 via-55% to-transparent p-5 pt-16 space-y-2 z-20 pointer-events-auto">

            {/* Name, Age, Verification & Info Trigger */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <h3 className="text-xl font-black text-white tracking-tight drop-shadow truncate">
                  {currentProfile.displayName}, {currentProfile.age}
                </h3>
                {currentProfile.verified && (
                  <AuraVerifiedBadge size="sm" variant="icon-only" />
                )}
                {currentProfile.isBoosted && (!currentProfile.boostExpiresAt || new Date(currentProfile.boostExpiresAt).getTime() > Date.now()) && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/90 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)] border border-amber-300 animate-pulse tracking-wider shrink-0">
                    <Rocket className="w-3 h-3 fill-current" />
                    <span>BOOST</span>
                  </span>
                )}
              </div>

              {/* Info Button - Opens Full Profile Sheet */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProfileDetails(currentProfile);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition active:scale-90 shadow-md shrink-0"
                title="Więcej informacji"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Location & Distance */}
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                <MapPin className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                <span className="truncate">{currentProfile.location || 'Nearby'}</span>
              </div>
              <span className="text-fuchsia-300 font-bold bg-fuchsia-950/60 px-2 py-0.5 rounded-lg border border-fuchsia-500/30 text-[11px] shrink-0">
                {formatDistance(currentProfile.distanceKm)}
              </span>
            </div>

            {/* Bio Preview */}
            {currentProfile.bio && (
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed pt-0.5">
                {currentProfile.bio}
              </p>
            )}

            {/* Tribes & Looking For Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {currentProfile.tribes?.slice(0, 2).map((t, i) => (
                <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.08] text-slate-200 border border-white/10">
                  {t}
                </span>
              ))}
              {currentProfile.lookingFor?.slice(0, 2).map((lf, i) => (
                <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {lf}
                </span>
              ))}
            </div>

          </div>

        </motion.div>

      </div>

      {/* Tactile Control Buttons Bar with Vivid Neon Highlights */}
      <div className="flex items-center justify-center gap-3.5 pt-5 px-2">

        {/* Rewind / Undo Button */}
        <button
          type="button"
          id="btn-swipe-undo"
          onClick={handleUndo}
          disabled={history.length === 0}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-90 shadow-lg ${
            history.length > 0
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30 hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              : 'bg-white/[0.03] border-white/10 text-slate-600 cursor-not-allowed opacity-40'
          }`}
          title="Undo"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Pass (NOPE) Button with Vivid Neon Rose Glow */}
        <button
          type="button"
          id="btn-swipe-pass"
          onClick={() => handleSwipe('left')}
          className="w-14 h-14 rounded-full bg-rose-500/20 hover:bg-rose-500/35 border-2 border-rose-400 text-rose-300 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.45)] hover:shadow-[0_0_30px_rgba(244,63,94,0.7)] group"
          title="Pass"
        >
          <X className="w-7 h-7 stroke-[2.5] transition-transform group-hover:scale-115 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
        </button>

        {/* SuperLike Button with Vivid Neon Cyan Glow */}
        <button
          type="button"
          id="btn-swipe-superlike"
          onClick={() => handleSwipe('up')}
          className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 border-2 border-cyan-300 text-cyan-200 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.8)] group"
          title="Super Like (⭐)"
        >
          <Star className="w-5 h-5 fill-current transition-transform group-hover:scale-115 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
        </button>

        {/* Like (Heart) Button with Vivid Neon Fuchsia / Pink Glow */}
        <button
          type="button"
          id="btn-swipe-like"
          onClick={() => handleSwipe('right')}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-fuchsia-600 via-pink-500 to-rose-500 border-2 border-fuchsia-300 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-[0_0_25px_rgba(217,70,239,0.75)] hover:shadow-[0_0_35px_rgba(217,70,239,1)] group"
          title="Like ❤️"
        >
          <Heart className="w-7 h-7 fill-current transition-transform group-hover:scale-115 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
        </button>

        {/* Quick Tap Trigger Button with Vivid Neon Purple / Violet Glow */}
        <button
          type="button"
          id="btn-swipe-tap"
          onClick={() => setShowTapMenu(prev => !prev)}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-90 shadow-lg ${
            showTapMenu
              ? 'bg-fuchsia-500 border-white text-white shadow-[0_0_20px_rgba(217,70,239,1)]'
              : 'bg-purple-950/60 hover:bg-purple-900/60 border-purple-400/60 text-purple-300 hover:scale-105 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
          }`}
          title="Quick Tap (⚡)"
        >
          <Zap className="w-5 h-5 fill-current" />
        </button>

      </div>

      {/* Keyboard Shortcuts Hint Bar */}
      <div className="hidden sm:flex items-center justify-center gap-4 text-[10px] text-slate-400 font-medium pt-3 text-center">
        <span>← Pass</span>
        <span>•</span>
        <span>↑ Super Like</span>
        <span>•</span>
        <span>→ Like</span>
        <span>•</span>
        <span>Spacja: Szczegóły</span>
      </div>

      {/* Mutual Match Celebratory Modal */}
      <AnimatePresence>
        {matchedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="w-full max-w-sm rounded-[32px] border border-fuchsia-500/40 bg-gradient-to-b from-[#180d2b] to-[#0a0714] p-6 text-center space-y-5 shadow-2xl relative overflow-hidden"
            >
              {/* Background ambient glow */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-fuchsia-500/30 blur-[60px] rounded-full pointer-events-none" />

              <div className="space-y-1">
                <span className="text-[11px] font-black tracking-widest text-fuchsia-400 uppercase">
                  Gratulacje!
                </span>
                <h3 className="text-2xl font-black text-white tracking-wide">
                  To dopasowanie!
                </h3>
                <p className="text-xs text-slate-300">
                  Ty i <span className="text-fuchsia-300 font-bold">{matchedProfile.displayName}</span> polubiliście się nawzajem!
                </p>
              </div>

              {/* Matched Avatars */}
              <div className="flex items-center justify-center -space-x-4 py-2">
                <div className="w-20 h-20 rounded-full border-4 border-fuchsia-500 overflow-hidden shadow-xl shadow-fuchsia-950/60 z-10">
                  <img
                    src={currentUser?.profile?.photos?.[0]?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'}
                    alt="Ty"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-20 h-20 rounded-full border-4 border-purple-500 overflow-hidden shadow-xl shadow-purple-950/60 z-20">
                  <img
                    src={matchedProfile.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                    alt={matchedProfile.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Match CTA buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = matchedProfile.userId;
                    setMatchedProfile(null);
                    onOpenChat(targetId);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-sm font-black text-white shadow-xl shadow-fuchsia-950/50 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Napisz wiadomość</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMatchedProfile(null)}
                  className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 active:scale-95 transition"
                >
                  Odkrywaj dalej
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
