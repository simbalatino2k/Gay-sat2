import React, { useState, useEffect } from 'react';
import { UserProfile, FilterState, UserAccount, TapType } from '../types';
import { FilterSheet } from './FilterSheet';
import { ProfileModal } from './ProfileModal';
import { Shimmer } from './Shimmer';
import { SlidersHorizontal, Sparkles, CheckCircle2, ShieldCheck, MapPin, Grid, Flame, Zap, Hand } from 'lucide-react';
import { formatDistance } from '../utils/formatDistance';
import { ProfileAuraFrame } from './ProfileAuraFrame';
import { motion, AnimatePresence } from 'motion/react';
import { AdSlot, AdConsentModal } from './ads';
import { ADS_CONFIG } from '../config/adsConfig';
import { SwipeCardDeck } from './SwipeCardDeck';
import { SwipableGridCard } from './SwipableGridCard';

interface DiscoverFeedProps {
  authToken: string;
  currentUser?: UserAccount | null;
  onLikeProfile: (profile: UserProfile) => void;
  onOpenChat: (userId: string) => void;
  onSwitchToMap?: () => void;
  onOpenPremium?: () => void;
  filter?: FilterState;
  onFilterChange?: (filter: FilterState) => void;
  isFilterOpen?: boolean;
  onOpenFilters?: () => void;
  onCloseFilters?: () => void;
}

export const DiscoverFeed: React.FC<DiscoverFeedProps> = ({
  authToken,
  currentUser = null,
  onLikeProfile,
  onOpenChat,
  onSwitchToMap,
  onOpenPremium,
  filter: controlledFilter,
  onFilterChange,
  isFilterOpen,
  onOpenFilters,
  onCloseFilters
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [internalShowFilter, setInternalShowFilter] = useState(false);
  const [showAdConsentModal, setShowAdConsentModal] = useState(false);
  
  // View Mode: 'swipe' (Card Deck) or 'grid' (Multi-column)
  const [viewMode, setViewMode] = useState<'swipe' | 'grid'>(() => {
    const stored = localStorage.getItem('aura_discover_view_mode');
    return (stored === 'swipe' || stored === 'grid') ? stored : 'swipe';
  });

  useEffect(() => {
    localStorage.setItem('aura_discover_view_mode', viewMode);
  }, [viewMode]);

  // Set of dismissed profile IDs when swiping in grid view
  const [dismissedProfileIds, setDismissedProfileIds] = useState<Set<string>>(new Set());

  // Responsive Columns State
  const [columns, setColumns] = useState<'auto'|2|3|4|5|6>(() => {
    const stored = localStorage.getItem('aura_grid_cols');
    return stored ? (stored === 'auto' ? 'auto' : parseInt(stored, 10) as any) : 'auto';
  });

  // Quick Taps State
  const [activeTapMenuUserId, setActiveTapMenuUserId] = useState<string | null>(null);
  const [tapSuccessFeedback, setTapSuccessFeedback] = useState<{ [userId: string]: string }>({});

  const handleSendQuickTap = async (e: React.MouseEvent, targetUserId: string, tapType: TapType) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/taps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ targetUserId, tapType })
      });
      if (res.ok) {
        const labels: Record<TapType, string> = {
          HOT: '🔥 Wysłano Hot!',
          WOOF: '🐾 Wysłano Woof!',
          BOLT: '⚡ Wysłano Bolt!',
          WAVE: '👋 Pomachano!'
        };
        setTapSuccessFeedback(prev => ({ ...prev, [targetUserId]: labels[tapType] }));
        setActiveTapMenuUserId(null);
        setTimeout(() => {
          setTapSuccessFeedback(prev => {
            const next = { ...prev };
            delete next[targetUserId];
            return next;
          });
        }, 2500);
      }
    } catch (err) {
      console.error('Failed to send tap:', err);
    }
  };

  useEffect(() => {
    localStorage.setItem('aura_grid_cols', columns.toString());
  }, [columns]);

  const [internalFilter, setInternalFilter] = useState<FilterState>({
    minAge: 18,
    maxAge: 65,
    maxDistanceKm: 0,
    roles: [],
    lookingFor: [],
    tribes: [],
    verifiedOnly: false,
    onlineOnly: false,
    hasPhotosOnly: false
  });

  const filter = controlledFilter ?? internalFilter;
  const setFilter = (updater: FilterState | ((prev: FilterState) => FilterState)) => {
    const nextVal = typeof updater === 'function' ? updater(filter) : updater;
    if (onFilterChange) {
      onFilterChange(nextVal);
    } else {
      setInternalFilter(nextVal);
    }
  };

  const showFilter = isFilterOpen ?? internalShowFilter;
  const setShowFilter = (show: boolean) => {
    if (show) {
      onOpenFilters ? onOpenFilters() : setInternalShowFilter(true);
    } else {
      onCloseFilters ? onCloseFilters() : setInternalShowFilter(false);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/profiles', { headers });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      const data = await res.json();
      if (data && Array.isArray(data.profiles)) {
        setProfiles(data.profiles);
      }
    } catch (err) {
      console.warn('Fetch profiles notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [authToken]);

  // Client-side filtering helper
  const filteredProfiles = profiles.filter(p => {
    if (filter.maxDistanceKm && filter.maxDistanceKm > 0 && p.distanceKm > filter.maxDistanceKm) return false;
    if (p.age < filter.minAge || p.age > filter.maxAge) return false;
    if (filter.verifiedOnly && !p.verified) return false;
    if (filter.onlineOnly && !p.isOnline) return false;
    if (filter.roles.length > 0 && !filter.roles.includes(p.identityRole)) return false;
    if (filter.tribes.length > 0 && !p.tribes.some(t => filter.tribes.includes(t))) return false;
    if (filter.lookingFor.length > 0 && !p.lookingFor.some(l => filter.lookingFor.includes(l))) return false;
    return true;
  });

  const activeFilterCount = (filter.roles.length > 0 ? 1 : 0) +
    (filter.tribes.length > 0 ? 1 : 0) +
    (filter.lookingFor.length > 0 ? 1 : 0) +
    (filter.onlineOnly ? 1 : 0) +
    (filter.verifiedOnly ? 1 : 0) +
    (filter.hasPhotosOnly ? 1 : 0) +
    (filter.maxDistanceKm > 0 ? 1 : 0) +
    (filter.minAge > 18 || filter.maxAge < 65 ? 1 : 0);

  const handleCardLike = (profile: UserProfile) => {
    onLikeProfile(profile);
    setDismissedProfileIds(prev => new Set(prev).add(profile.id));
    fetch('/api/likes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ targetUserId: profile.userId })
    }).catch(err => console.warn('Like API notice:', err));
  };

  const handleCardPass = (profile: UserProfile) => {
    setDismissedProfileIds(prev => new Set(prev).add(profile.id));
  };

  const visibleGridProfiles = filteredProfiles.filter(p => !dismissedProfileIds.has(p.id));

  const gridClassMap = {
    'auto': 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-4 pb-40 pt-1 px-3 sm:px-6 relative">
      
      {/* Top Header with Tactile Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between px-1 gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
              {viewMode === 'swipe' ? 'Swipe Match' : 'Odkrywaj w pobliżu'}
            </h2>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {filteredProfiles.length} {filteredProfiles.length === 1 ? 'aktywny profil' : 'aktywnych profili'} w Twojej okolicy
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher: Swipe Cards vs Grid */}
          <div className="flex items-center gap-1 bg-black/60 border border-white/15 p-1 rounded-2xl backdrop-blur-md shadow-md">
            <button
              type="button"
              id="btn-switch-swipe"
              onClick={() => setViewMode('swipe')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                viewMode === 'swipe'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Przełącz na karty do swipe-owania"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Karty</span>
            </button>
            <button
              type="button"
              id="btn-switch-grid"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Przełącz na siatkę profili"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Siatka</span>
            </button>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilter({
                minAge: 18,
                maxAge: 65,
                maxDistanceKm: 0,
                roles: [],
                lookingFor: [],
                tribes: [],
                verifiedOnly: false,
                onlineOnly: false,
                hasPhotosOnly: false
              })}
              className="text-[10px] font-bold text-fuchsia-300 hover:text-white px-2.5 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 transition-all active:scale-95"
            >
              Resetuj ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Feed Content: Swipe Card Deck OR Swipable Grid */}
      {loading ? (
        <Shimmer />
      ) : filteredProfiles.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-8 text-center space-y-3 my-8 shadow-xl max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-fuchsia-400" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">Brak profili pasujących do filtrów</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Spróbuj zwiększyć promień wyszukiwania lub zresetować filtry wieku i preferencji.
            </p>
          </div>
          <button
            onClick={() => setFilter({
              minAge: 18,
              maxAge: 65,
              maxDistanceKm: 100,
              roles: [],
              lookingFor: [],
              tribes: [],
              verifiedOnly: false,
              onlineOnly: false,
              hasPhotosOnly: false
            })}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-xs font-bold text-white shadow-md shadow-purple-950/40 hover:brightness-110 active:scale-95 transition"
          >
            Resetuj filtry
          </button>
        </div>
      ) : viewMode === 'swipe' ? (
        /* Tactile Motion-Driven Card Deck Mode */
        <SwipeCardDeck
          profiles={filteredProfiles}
          authToken={authToken}
          currentUser={currentUser}
          onLikeProfile={onLikeProfile}
          onOpenChat={onOpenChat}
          onSelectProfileDetails={setSelectedProfile}
          onResetFilters={() => setFilter({
            minAge: 18,
            maxAge: 65,
            maxDistanceKm: 100,
            roles: [],
            lookingFor: [],
            tribes: [],
            verifiedOnly: false,
            onlineOnly: false,
            hasPhotosOnly: false
          })}
        />
      ) : (
        /* Multi-Column Swipable Grid Mode */
        <motion.div 
          layout
          className={`grid gap-3 transition-all duration-500 ease-out ${gridClassMap[columns]}`}
        >
          <AnimatePresence>
            {visibleGridProfiles.map((p, idx) => (
              <React.Fragment key={p.id}>
                <SwipableGridCard
                  profile={p}
                  onSelect={() => setSelectedProfile(p)}
                  onLike={handleCardLike}
                  onPass={handleCardPass}
                  activeTapMenuUserId={activeTapMenuUserId}
                  setActiveTapMenuUserId={setActiveTapMenuUserId}
                  tapSuccessFeedback={tapSuccessFeedback}
                  handleSendQuickTap={handleSendQuickTap}
                />

                {/* Seamless Native Ad Tile (Shown every AD_FREQUENCY_DISCOVER profiles) */}
                {(idx + 1) % ADS_CONFIG.AD_FREQUENCY_DISCOVER === 0 && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                    key={`native-ad-discover-${idx}`}
                  >
                    <AdSlot
                      placement="discover"
                      format="feed-card"
                      currentUser={currentUser}
                      adIndex={Math.floor((idx + 1) / ADS_CONFIG.AD_FREQUENCY_DISCOVER) - 1}
                      onOpenPrivacy={() => setShowAdConsentModal(true)}
                      onOpenPremium={onOpenPremium}
                      className="w-full h-full"
                    />
                  </motion.div>
                )}
              </React.Fragment>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Floating Bottom Quick Action Panel / Glass Frame */}
      {/* Positioned right above the bottom navigation bar (paskiem kontrolnym), allowing the profile grid to scroll smoothly behind it */}
      <div className="fixed bottom-[64px] sm:bottom-[70px] inset-x-0 z-30 pointer-events-none px-3 sm:px-4">
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto pointer-events-auto">
          <div className="aura-glass-card rounded-[22px] sm:rounded-[26px] border border-white/15 bg-[#070914]/85 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_24px_rgba(217,70,239,0.18)_inset] p-2 sm:p-2.5 transition-all duration-300">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              
              {/* Left: Quick Filter Toggles & Mode */}
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {/* Mode Switcher Button */}
                <button
                  type="button"
                  onClick={() => setViewMode(prev => prev === 'swipe' ? 'grid' : 'swipe')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all shrink-0 active:scale-95 ${
                    viewMode === 'swipe'
                      ? 'bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 border border-fuchsia-500/50 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.35)]'
                      : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white'
                  }`}
                  title={viewMode === 'swipe' ? 'Przełącz na widok siatki' : 'Przełącz na karty do swipe-owania'}
                >
                  {viewMode === 'swipe' ? (
                    <>
                      <Grid className="w-3.5 h-3.5 text-fuchsia-300" />
                      <span>Siatka</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-3.5 h-3.5 text-fuchsia-400 fill-current" />
                      <span>Karty</span>
                    </>
                  )}
                </button>

                {/* Online Filter Toggle */}
                <button
                  onClick={() => setFilter(prev => ({ ...prev, onlineOnly: !prev.onlineOnly }))}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                    filter.onlineOnly
                      ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                      : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                  title="Pokaż tylko użytkowników online"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${filter.onlineOnly ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-slate-500'}`} />
                  <span>Online</span>
                </button>

                {/* Verified 18+ Toggle */}
                <button
                  onClick={() => setFilter(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 active:scale-95 ${
                    filter.verifiedOnly
                      ? 'bg-cyan-500/25 border border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                      : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                  title="Pokaż tylko zweryfikowane profile 18+"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${filter.verifiedOnly ? 'text-cyan-300' : 'text-slate-400'}`} />
                  <span className="hidden xs:inline">18+</span>
                </button>

                {/* Columns Density Switcher (Visible in grid mode) */}
                {viewMode === 'grid' && (
                  <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded-full p-0.5 shrink-0">
                    <div className="px-1.5 opacity-50">
                      <Grid className="w-3 h-3 text-slate-300" />
                    </div>
                    {(['auto', 2, 3, 4, 5, 6] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => setColumns(opt)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          columns === opt
                            ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_10px_rgba(217,70,239,0.4)]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt === 'auto' ? 'Auto' : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Actions (Radar Map & Filters) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onSwitchToMap && (
                  <button
                    onClick={onSwitchToMap}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-fuchsia-500/35 bg-fuchsia-500/15 text-xs font-bold text-fuchsia-300 hover:bg-fuchsia-500/25 active:scale-95 transition-all shadow-sm"
                    title="Przełącz na Google Maps Radar"
                  >
                    <MapPin className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
                    <span>Radar</span>
                  </button>
                )}

                <button
                  onClick={() => setShowFilter(true)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95 shadow-sm ${
                    activeFilterCount > 0
                      ? 'border-fuchsia-500/50 bg-fuchsia-500/20 text-white shadow-[0_0_12px_rgba(217,70,239,0.3)]'
                      : 'border-white/15 bg-white/[0.07] hover:bg-white/[0.12] text-slate-200'
                  }`}
                  title="Otwórz wszystkie filtry"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>Filtry</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-[9px] font-black flex items-center justify-center shadow-md">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Filter Sheet Modal */}
      <FilterSheet
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        filter={filter}
        onApply={(updated) => setFilter(updated)}
      />

      {/* Detailed Profile Modal */}
      <ProfileModal
        profile={selectedProfile}
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        authToken={authToken}
        onLike={(p) => {
          onLikeProfile(p);
          setSelectedProfile(null);
        }}
        onOpenChat={(userId) => {
          setSelectedProfile(null);
          onOpenChat(userId);
        }}
        onReport={async (p, reason) => {
          try {
            await fetch('/api/dsa/report', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({ reportedUserId: p.userId, reason, details: reason })
            });
          } catch (e) {
            console.error(e);
          }
        }}
        onBlock={async (userId) => {
          try {
            await fetch('/api/blocks', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({ blockedUserId: userId })
            });
            setSelectedProfile(null);
            fetchProfiles();
          } catch (e) {
            console.error(e);
          }
        }}
      />

      <AdConsentModal
        isOpen={showAdConsentModal}
        onClose={() => setShowAdConsentModal(false)}
        onOpenPremium={onOpenPremium}
      />

    </div>
  );
};
