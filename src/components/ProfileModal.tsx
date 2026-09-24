import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, TapType } from '../types';
import {
  X, Heart, MessageSquare, Sparkles, Flag, Ban, MapPin,
  ShieldCheck, Lock, Unlock, Zap, Flame, Hand, Check,
  Phone, Video, Rocket, ChevronLeft, ChevronRight, Share2
} from 'lucide-react';
import { formatDistanceDescriptive } from '../utils/formatDistance';
import { ProfileAuraFrame } from './ProfileAuraFrame';
import { AuraVerifiedBadge } from './common/AuraVerifiedBadge';
import { useScreenshotProtection } from '../hooks/useScreenshotProtection';
import { ScreenshotShield } from './common/ScreenshotShield';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onLike: (profile: UserProfile) => void;
  onOpenChat: (userId: string, initialMessage?: string) => void;
  onReport: (profile: UserProfile, reason: string) => void;
  onBlock: (userId: string) => void;
  onTapSent?: (userId: string, tapType: TapType) => void;
  onStartCall?: (targetUser: { id: string; displayName: string; photoUrl?: string; role?: string }, callType: 'video' | 'voice') => void;
  // Grindr-style Profiles Carousel & Navigation
  profiles?: UserProfile[];
  onNavigateProfile?: (nextProfile: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  authToken,
  onLike,
  onOpenChat,
  onReport,
  onBlock,
  onTapSent,
  onStartCall,
  profiles,
  onNavigateProfile
}) => {
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [loadingIce, setLoadingIce] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [requestingVault, setRequestingVault] = useState(false);
  const [vaultRequestedSuccess, setVaultRequestedSuccess] = useState(false);
  const [sendingTap, setSendingTap] = useState<string | null>(null);
  const [tapSuccess, setTapSuccess] = useState<string | null>(null);

  // Navigation & Photo carousel state
  const [slideDirection, setSlideDirection] = useState<number>(0);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  // Touch tracking for mobile swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Compute indices in profiles list
  const currentIndex = profile && profiles ? profiles.findIndex(p => p.id === profile.id) : -1;
  const hasPrev = profiles && currentIndex > 0;
  const hasNext = profiles && currentIndex >= 0 && currentIndex < profiles.length - 1;

  // Reset photo index when switching profile
  useEffect(() => {
    setActivePhotoIdx(0);
  }, [profile?.id]);

  const handlePrev = () => {
    if (!profiles || !onNavigateProfile || !hasPrev) return;
    setSlideDirection(-1);
    onNavigateProfile(profiles[currentIndex - 1]);
  };

  const handleNext = () => {
    if (!profiles || !onNavigateProfile || !hasNext) return;
    setSlideDirection(1);
    onNavigateProfile(profiles[currentIndex + 1]);
  };

  // Keyboard navigation Left / Right & Escape
  useEffect(() => {
    if (!isOpen || !profile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (hasPrev) handlePrev();
      } else if (e.key === 'ArrowRight') {
        if (hasNext) handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, profile, currentIndex, profiles, hasPrev, hasNext]);

  if (!isOpen || !profile) return null;

  const publicPhotos = (profile.photos || []).filter(p => !p.isPrivate);
  const privatePhotos = (profile.photos || []).filter(p => p.isPrivate);
  const hasLockedVault = privatePhotos.some(p => p.isLocked);

  // Current photo to display
  const currentPhotoUrl = publicPhotos[activePhotoIdx]?.url || profile.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800';

  // Anti-Screenshot & Screen Capture Protection for Profile Photos & Private Vault
  const { isScreenshotAttempted, isWindowBlurred, dismissWarning } = useScreenshotProtection({
    enabled: isOpen && !!profile,
    featureName: 'Zdjęcia & Skarbiec Profilu',
    protectOnBlur: true
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Horizontal swipe threshold: > 45px and predominantly horizontal
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0 && hasNext) {
        handleNext();
      } else if (deltaX > 0 && hasPrev) {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleRequestVault = async () => {
    if (!profile) return;
    setRequestingVault(true);
    try {
      const res = await fetch('/api/vault/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ targetUserId: profile.userId })
      });
      if (res.ok) {
        setVaultRequestedSuccess(true);
      }
    } catch (err) {
      console.error('Failed to request vault access:', err);
    } finally {
      setRequestingVault(false);
    }
  };

  const handleSendTap = async (tapType: TapType) => {
    if (!profile) return;
    setSendingTap(tapType);
    try {
      const res = await fetch('/api/taps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ targetUserId: profile.userId, tapType })
      });
      if (res.ok) {
        setTapSuccess(tapType);
        onTapSent?.(profile.userId, tapType);
        setTimeout(() => setTapSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to send tap:', err);
    } finally {
      setSendingTap(null);
    }
  };

  const handleFetchIcebreakers = async () => {
    setLoadingIce(true);
    try {
      const res = await fetch('/api/ai/propositions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ matchProfile: profile, vibe: 'Playful & Witty' })
      });
      const data = await res.json();
      if (data.propositions && Array.isArray(data.propositions)) {
        setIcebreakers(data.propositions);
      } else if (data.icebreakers) {
        setIcebreakers(data.icebreakers);
      }
    } catch (err) {
      console.error('Icebreaker error:', err);
      setIcebreakers([
        `Hey ${profile.displayName}! Loved your photos and vibe. How is your day going?`,
        `Hi ${profile.displayName}! Up for grabbing a coffee or drinks nearby sometime?`,
        `Hey there! Saw that you enjoy ${profile.interests?.[0] || 'good vibes'}. Let's connect!`
      ]);
    } finally {
      setLoadingIce(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-2 sm:p-4 transition-opacity duration-300">
      <ScreenshotShield
        isBlocked={isScreenshotAttempted}
        isWindowBlurred={isWindowBlurred}
        featureTitle="Zdjęcia & Skarbiec Profilu"
        onDismiss={dismissWarning}
        showWatermark={true}
        watermarkText="AURA 18+ PHOTO SECURE"
      >
        <div className="relative w-full max-w-sm flex items-center justify-center">

          {/* Desktop/Tablet Floating Previous Profile Button */}
          {hasPrev && (
            <button
              type="button"
              onClick={handlePrev}
              className="hidden sm:flex absolute -left-12 lg:-left-14 top-1/2 -translate-y-1/2 z-40 w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[#0a0c16]/90 border border-fuchsia-400/40 text-fuchsia-300 hover:text-white hover:bg-fuchsia-600/30 items-center justify-center shadow-[0_0_20px_rgba(217,70,239,0.35)] backdrop-blur-xl transition-all active:scale-90"
              title="Poprzedni profil (←)"
            >
              <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          )}

          {/* Desktop/Tablet Floating Next Profile Button */}
          {hasNext && (
            <button
              type="button"
              onClick={handleNext}
              className="hidden sm:flex absolute -right-12 lg:-right-14 top-1/2 -translate-y-1/2 z-40 w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[#0a0c16]/90 border border-fuchsia-400/40 text-fuchsia-300 hover:text-white hover:bg-fuchsia-600/30 items-center justify-center shadow-[0_0_20px_rgba(217,70,239,0.35)] backdrop-blur-xl transition-all active:scale-90"
              title="Następny profil (→)"
            >
              <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          )}

          {/* Grindr-like Profile Bubble Sheet (Dymek profilu) with Gestures & Slide Transition */}
          <motion.div
            key={profile.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.35}
            onDragEnd={(_e, { offset, velocity }) => {
              const swipeThreshold = 55;
              if (offset.x < -swipeThreshold || velocity.x < -250) {
                if (hasNext) handleNext();
              } else if (offset.x > swipeThreshold || velocity.x > 250) {
                if (hasPrev) handlePrev();
              }
            }}
            initial={{ opacity: 0, x: slideDirection === 0 ? 0 : slideDirection > 0 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection === 0 ? 0 : slideDirection > 0 ? -60 : 60 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="aura-glass-modal w-full max-w-sm rounded-[32px] border border-white/[0.14] bg-[#0c0e18]/95 p-4 sm:p-5 shadow-[0_30px_90px_rgba(0,0,0,0.95),0_0_1px_1px_rgba(255,255,255,0.08)_inset] space-y-3.5 max-h-[92vh] overflow-y-auto relative custom-scrollbar touch-pan-y"
          >
            {/* Top Grindr-Style Navigation Header */}
            <div className="flex items-center justify-between gap-1 pb-1 border-b border-white/[0.08]">
              {/* Previous Profile Button */}
              <button
                type="button"
                onClick={handlePrev}
                disabled={!hasPrev}
                className={`p-1.5 rounded-xl border transition-all flex items-center gap-0.5 text-xs font-bold active:scale-90 ${
                  hasPrev
                    ? 'border-white/10 bg-white/[0.06] text-slate-300 hover:text-white hover:border-fuchsia-400/50'
                    : 'border-transparent text-slate-600 opacity-30 cursor-not-allowed'
                }`}
                title="Poprzedni profil (←)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[10px] hidden xs:inline">Wstecz</span>
              </button>

              {/* Profile Counter & Swipe Hint Badge */}
              <div className="flex flex-col items-center select-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white tracking-wide">{profile.displayName}</span>
                  {profile.verified && <AuraVerifiedBadge size="sm" />}
                </div>
                {profiles && currentIndex >= 0 && (
                  <div className="flex items-center gap-1 text-[9.5px] font-bold text-fuchsia-300">
                    <span>{currentIndex + 1} z {profiles.length}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-cyan-300/90 flex items-center gap-0.5">↔ Przesuń</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Next Profile Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className={`p-1.5 rounded-xl border transition-all flex items-center gap-0.5 text-xs font-bold active:scale-90 ${
                    hasNext
                      ? 'border-white/10 bg-white/[0.06] text-slate-300 hover:text-white hover:border-fuchsia-400/50'
                      : 'border-transparent text-slate-600 opacity-30 cursor-not-allowed'
                  }`}
                  title="Następny profil (→)"
                >
                  <span className="text-[10px] hidden xs:inline">Dalej</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Close modal */}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl bg-black/60 text-slate-400 hover:text-white hover:bg-white/[0.12] border border-white/10 transition-all active:scale-90"
                  title="Zamknij (Esc)"
                >
                  <X className="w-4 h-4 stroke-[2.4]" />
                </button>
              </div>
            </div>

            {/* Photos / Primary Photo with Stories Bars */}
            <ProfileAuraFrame
              isOnline={profile.isOnline}
              intensity="prominent"
              className="relative aspect-[3/4] rounded-[24px] shadow-2xl overflow-hidden group select-none"
              innerClassName="bg-slate-950 border border-white/10"
            >
              {/* Instagram/Grindr Stories progress bars for multiple public photos */}
              {publicPhotos.length > 1 && (
                <div className="absolute top-2 inset-x-2 z-20 flex items-center gap-1 pointer-events-none">
                  {publicPhotos.map((_, pIdx) => (
                    <div
                      key={pIdx}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        pIdx === activePhotoIdx
                          ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                          : pIdx < activePhotoIdx
                          ? 'bg-white/60'
                          : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Tap Left / Right photo switchers (Only active if multiple photos) */}
              {publicPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx(prev => Math.max(0, prev - 1));
                    }}
                    className="absolute inset-y-0 left-0 w-1/3 z-10 opacity-0 group-hover:opacity-100 flex items-center pl-2 transition-opacity"
                    title="Poprzednie zdjęcie"
                  >
                    {activePhotoIdx > 0 && (
                      <span className="p-1.5 rounded-full bg-black/60 text-white backdrop-blur-md">
                        <ChevronLeft className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx(prev => Math.min(publicPhotos.length - 1, prev + 1));
                    }}
                    className="absolute inset-y-0 right-0 w-1/3 z-10 opacity-0 group-hover:opacity-100 flex items-center justify-end pr-2 transition-opacity"
                    title="Następne zdjęcie"
                  >
                    {activePhotoIdx < publicPhotos.length - 1 && (
                      <span className="p-1.5 rounded-full bg-black/60 text-white backdrop-blur-md">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                </>
              )}

              <img
                src={currentPhotoUrl}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                loading="lazy"
                draggable={false}
                className="w-full h-full object-cover protected-image select-none pointer-events-none"
                onContextMenu={(e) => e.preventDefault()}
              />

              {/* Photo count pill */}
              {publicPhotos.length > 1 && (
                <div className="absolute top-4 right-3 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white shadow-md pointer-events-none">
                  {activePhotoIdx + 1} / {publicPhotos.length}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06070c] via-[#06070c]/80 via-50% to-transparent p-4 pt-14 space-y-1 pointer-events-none">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white tracking-tight">{profile.displayName}, {profile.age}</h2>
                  {profile.verified && (
                    <AuraVerifiedBadge size="sm" variant="pill" customLabel="Aura Verified" />
                  )}
                  <span className="flex items-center gap-1 bg-cyan-950/80 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/40 select-none">
                    <Lock className="w-2.5 h-2.5 text-cyan-400" />
                    <span>SECURE</span>
                  </span>
                {profile.isBoosted && (!profile.boostExpiresAt || new Date(profile.boostExpiresAt).getTime() > Date.now()) && (
                  <span className="flex items-center gap-1 bg-amber-500/90 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse tracking-wider">
                    <Rocket className="w-3 h-3 fill-current" />
                    <span>BOOSTED</span>
                  </span>
                )}
                {profile.lookingFor?.includes('Right Now') && (
                  <span className="flex items-center gap-1 bg-gradient-to-r from-amber-500/25 to-rose-500/25 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>RIGHT NOW</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <MapPin className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>
                  {profile.location && profile.location !== 'Global' && profile.location !== 'Global Member' ? `${profile.location} · ` : ''}
                  <strong className="text-fuchsia-300 font-semibold">{formatDistanceDescriptive(profile.distanceKm)}</strong>
                </span>
                {profile.isOnline && (
                  <span className="ml-1 flex items-center gap-1 text-[10.5px] text-emerald-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                    Online teraz
                  </span>
                )}
              </div>
            </div>
          </ProfileAuraFrame>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onLike(profile)}
            className="aura-btn-primary flex-1 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all duration-200 shadow-lg shadow-fuchsia-950/50"
          >
            <Heart className="w-4 h-4 fill-white shrink-0" />
            <span>Like</span>
          </button>
          <button
            onClick={() => { onClose(); onOpenChat(profile.userId); }}
            className="flex-1 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-bold text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all duration-200 shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-cyan-300 shrink-0" />
            <span>Czat</span>
          </button>
          {onStartCall && (
            <>
              <button
                id="btn-profile-voice-call"
                type="button"
                onClick={() => {
                  onClose();
                  onStartCall({
                    id: profile.userId,
                    displayName: profile.displayName,
                    photoUrl: profile.photos?.[0]?.url,
                    role: profile.identityRole
                  }, 'voice');
                }}
                className="p-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white transition active:scale-95 shadow-sm"
                title="Rozpocznij rozmowę głosową"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
              </button>
              <button
                id="btn-profile-video-call"
                type="button"
                onClick={() => {
                  onClose();
                  onStartCall({
                    id: profile.userId,
                    displayName: profile.displayName,
                    photoUrl: profile.photos?.[0]?.url,
                    role: profile.identityRole
                  }, 'video');
                }}
                className="p-3 rounded-2xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 hover:text-white transition active:scale-95 shadow-sm"
                title="Rozpocznij wideorozmowę"
              >
                <Video className="w-4 h-4 text-fuchsia-400" />
              </button>
            </>
          )}
        </div>

        {/* Quick Aura Taps */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-0.5">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Szybka zaczepka (Aura Tap)</span>
            </span>
            {tapSuccess && (
              <span className="text-emerald-400 text-[10px] font-bold animate-fade-in flex items-center gap-1">
                <Check className="w-3 h-3" /> Wysłano!
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { type: 'HOT', icon: '🔥', label: 'Ogień', hover: 'hover:border-rose-500/60 hover:bg-rose-500/20' },
              { type: 'WOOF', icon: '🐾', label: 'Woof', hover: 'hover:border-amber-500/60 hover:bg-amber-500/20' },
              { type: 'BOLT', icon: '⚡', label: 'Aura Tap', hover: 'hover:border-fuchsia-500/60 hover:bg-fuchsia-500/20' },
              { type: 'WAVE', icon: '👋', label: 'Pomachaj', hover: 'hover:border-cyan-500/60 hover:bg-cyan-500/20' }
            ].map(t => (
              <button
                key={t.type}
                type="button"
                disabled={sendingTap === t.type}
                onClick={() => handleSendTap(t.type as TapType)}
                className={`py-2 px-1 rounded-xl border border-white/10 bg-black/40 flex flex-col items-center justify-center gap-1 transition-all active:scale-90 shadow-sm ${t.hover}`}
              >
                <span className="text-lg">{t.icon}</span>
                <span className="text-[10px] font-semibold text-slate-300">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Gallery: Public Photos */}
        {publicPhotos.length > 1 && (
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Public Gallery ({publicPhotos.length})</h4>
            <div className="grid grid-cols-3 gap-2">
              {publicPhotos.slice(1).map(p => (
                <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black shadow-md protected-media-container select-none" onContextMenu={(e) => e.preventDefault()}>
                  <img src={p.url} alt="Gallery photo" referrerPolicy="no-referrer" draggable={false} className="w-full h-full object-cover protected-image select-none pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Private Vault / Skarbiec */}
        {privatePhotos.length > 0 && (
          <div className="rounded-[24px] border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-black to-purple-950/20 p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-200 uppercase tracking-wider">Prywatny Skarbiec</h4>
                  <p className="text-[10px] text-amber-300/70">{privatePhotos.length} {privatePhotos.length === 1 ? 'prywatne zdjęcie' : 'prywatne zdjęcia'}</p>
                </div>
              </div>
              {!hasLockedVault && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Odblokowany
                </span>
              )}
            </div>

            {hasLockedVault ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  {privatePhotos.map((p, idx) => (
                    <div key={p.id || idx} className="relative aspect-square rounded-2xl overflow-hidden border border-amber-500/30 bg-slate-950 flex flex-col items-center justify-center p-2 text-center">
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
                      <Lock className="w-5 h-5 text-amber-400 relative z-10" />
                      <span className="text-[9px] font-bold text-amber-300 relative z-10 mt-1">Zablokowane</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRequestVault}
                  disabled={requestingVault || vaultRequestedSuccess}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-bold text-black shadow-lg shadow-amber-950/50 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {vaultRequestedSuccess
                      ? 'Wysłano prośbę o dostęp ⏳'
                      : requestingVault
                      ? 'Wysyłanie prośby...'
                      : 'Poproś o dostęp do prywatnego albumu'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {privatePhotos.map(p => (
                  <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden border border-amber-500/40 bg-black shadow-md protected-media-container select-none" onContextMenu={(e) => e.preventDefault()}>
                    <img src={p.url} alt="Vault photo" referrerPolicy="no-referrer" draggable={false} className="w-full h-full object-cover protected-image select-none pointer-events-none" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sexual Role & Looking For Badges */}
        <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.02] p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold text-[11px]">Role / Position:</span>
            <span className="font-bold text-purple-300 bg-purple-500/20 px-3 py-0.5 rounded-full border border-purple-500/30">
              {profile.identityRole}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-semibold text-[11px]">Looking For:</span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {profile.lookingFor.map(lf => (
                <span key={lf} className="text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/25">
                  {lf}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">About Me</h4>
            <p className="text-xs text-slate-300 leading-relaxed bg-black/40 p-3 rounded-2xl border border-white/[0.06]">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Interests & Tribes */}
        <div className="space-y-2.5">
          {profile.tribes.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tribes</h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.tribes.map(t => (
                  <span key={t} className="text-[10px] font-bold text-fuchsia-300 bg-fuchsia-500/10 px-2.5 py-0.5 rounded-full border border-fuchsia-500/25">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.interests.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Interests</h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map(i => (
                  <span key={i} className="text-[10px] font-medium text-slate-300 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
                    #{i}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Icebreaker Generator */}
        <div className="rounded-[22px] border border-purple-500/30 bg-purple-500/10 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AURA Icebreaker Suggestion</span>
            </div>
            <button
              onClick={handleFetchIcebreakers}
              disabled={loadingIce}
              className="text-[10px] font-bold text-purple-200 underline hover:text-white"
            >
              {loadingIce ? 'Generating...' : 'Suggest phrase'}
            </button>
          </div>

          {icebreakers.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {icebreakers.map((line, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onClose();
                    onOpenChat(profile.userId, line);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-black/40 hover:bg-purple-950/40 border border-purple-500/30 hover:border-purple-400 text-[11px] text-purple-200 transition flex items-center justify-between gap-2 group active:scale-[0.99]"
                >
                  <span className="italic flex-1">"{line}"</span>
                  <span className="text-[10px] font-bold text-fuchsia-300 group-hover:underline shrink-0">
                    Send in Chat →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Safety Actions */}
        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={() => onBlock(profile.userId)}
            className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Block Member</span>
          </button>
          <button
            onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-1 text-slate-400 hover:text-amber-400 transition"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report Profile</span>
          </button>
        </div>

        {showReport && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5">
            <div className="text-xs font-bold text-amber-300">Notice & Action Form (DSA Article 16)</div>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
            >
              <option value="">Select violation category...</option>
              <option value="UNDERAGE_SUSPICION">Suspicion of Minor (&lt;18) - Immediate Priority</option>
              <option value="NON_CONSENSUAL_MEDIA">Non-consensual sexual media</option>
              <option value="HARASSMENT_OR_HATE">Harassment or discriminatory speech</option>
              <option value="IMPERSONATION_OR_SCAM">Impersonation, bot, or financial scam</option>
              <option value="COMMERCIAL_SOLICITATION">Commercial solicitation or prostitution</option>
              <option value="TERMS_VIOLATION">Other terms of service violation</option>
            </select>
            <input
              type="text"
              placeholder="Additional details / context (optional)..."
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
            />
            <button
              onClick={() => {
                if (reportReason) {
                  onReport(profile, reportDetails ? `${reportReason}: ${reportDetails}` : reportReason);
                  setShowReport(false);
                  setReportReason('');
                  setReportDetails('');
                }
              }}
              disabled={!reportReason}
              className="w-full py-1.5 rounded-xl bg-amber-600 text-xs font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
            >
              Submit Official Notice (DSA Art. 16)
            </button>
          </div>
        )}

        {/* Bottom Swipe Hint Indicator */}
        {profiles && profiles.length > 1 && (
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400 select-none">
            <span className="text-fuchsia-400 animate-pulse">←</span>
            <span>Przesuń palcem w lewo/prawo, aby zmienić profil</span>
            <span className="text-fuchsia-400 animate-pulse">→</span>
          </div>
        )}

          </motion.div>
        </div>
      </ScreenshotShield>
    </div>
  );
};
