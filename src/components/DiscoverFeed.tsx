import React, { useState, useEffect } from 'react';
import { UserProfile, FilterState } from '../types';
import { FilterSheet } from './FilterSheet';
import { ProfileModal } from './ProfileModal';
import { Shimmer } from './Shimmer';
import { SlidersHorizontal, Sparkles, CheckCircle2, ShieldCheck, MapPin, Grid } from 'lucide-react';
import { formatDistance } from '../utils/formatDistance';
import { ProfileAuraFrame } from './ProfileAuraFrame';
import { motion, AnimatePresence } from 'motion/react';

interface DiscoverFeedProps {
  authToken: string;
  onLikeProfile: (profile: UserProfile) => void;
  onOpenChat: (userId: string) => void;
  onSwitchToMap?: () => void;
}

export const DiscoverFeed: React.FC<DiscoverFeedProps> = ({
  authToken,
  onLikeProfile,
  onOpenChat,
  onSwitchToMap
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  
  // Responsive Columns State
  const [columns, setColumns] = useState<'auto'|2|3|4|5|6>(() => {
    const stored = localStorage.getItem('aura_grid_cols');
    return stored ? (stored === 'auto' ? 'auto' : parseInt(stored, 10) as any) : 'auto';
  });

  useEffect(() => {
    localStorage.setItem('aura_grid_cols', columns.toString());
  }, [columns]);

  const [filter, setFilter] = useState<FilterState>({
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

  const gridClassMap = {
    'auto': 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-4 pb-24 pt-1 px-3 sm:px-6">
      
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-4">
        <div>
          <h2 className="text-base font-extrabold text-white tracking-wide">Nearby & Discover</h2>
          <p className="text-[11px] text-slate-400 font-medium">
            {filteredProfiles.length} active profiles near you
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Columns Control */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-full p-1 shadow-inner backdrop-blur-sm mr-2">
            <div className="pl-2 pr-1 flex items-center justify-center opacity-50">
              <Grid className="w-3.5 h-3.5" />
            </div>
            {(['auto', 2, 3, 4, 5, 6] as const).map(opt => (
               <button
                  key={opt}
                  onClick={() => setColumns(opt)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 ${
                    columns === opt 
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.3)]' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {opt === 'auto' ? 'Auto' : opt}
               </button>
            ))}
          </div>

          {onSwitchToMap && (
            <button
              onClick={onSwitchToMap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-500/20 active:scale-95 transition-all shadow-sm"
              title="Open Interactive Radar"
            >
              <MapPin className="w-3.5 h-3.5 text-fuchsia-400" />
              <span className="hidden sm:inline">Radar Map</span>
            </button>
          )}

          <button
            onClick={() => setShowFilter(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl text-xs font-semibold text-slate-200 hover:bg-white/[0.08] hover:border-purple-500/30 active:scale-95 transition-all shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Grid Feed */}
      {loading ? (
        <Shimmer />
      ) : filteredProfiles.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-8 text-center space-y-3 my-8 shadow-xl max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-fuchsia-400" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">No profiles match these filters</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Try expanding the search radius or adjusting age and selected roles.
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
            Reset Filters
          </button>
        </div>
      ) : (
        <motion.div 
          layout
          className={`grid gap-3 transition-all duration-500 ease-out ${gridClassMap[columns]}`}
        >
          <AnimatePresence>
            {filteredProfiles.map((p) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
                key={p.id}
                className="w-full h-full"
              >
                <ProfileAuraFrame
                  isOnline={p.isOnline}
                  onClick={() => setSelectedProfile(p)}
                  className="aspect-[3/4] rounded-[24px] cursor-pointer group transition-all duration-300 ease-out hover:scale-[1.015] active:scale-[0.985] shadow-xl shadow-black/70 h-full w-full"
                  innerClassName="aura-glass-card border border-white/[0.08]"
                >
                  <img
                    src={p.photos[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                    alt={p.displayName}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
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

                  {/* Cinematic Bottom Fade Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06070c] via-[#06070c]/80 via-45% to-transparent p-3 pt-12 space-y-1 z-10">
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

                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
                      <span className="truncate max-w-[95px] text-slate-300/90">{p.location || 'Nearby'}</span>
                      <span className="text-fuchsia-300 font-bold bg-fuchsia-950/50 px-1.5 py-0.5 rounded-md border border-fuchsia-500/25 text-[9.5px] shrink-0">
                        {formatDistance(p.distanceKm)}
                      </span>
                    </div>
                  </div>
                </ProfileAuraFrame>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

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

    </div>
  );
};
