import React, { useState, useEffect } from 'react';
import { MatchRecord } from '../types';
import { Heart, MessageSquare, Flame, Sparkles, ShieldCheck } from 'lucide-react';
import { ProfileAuraFrame } from './ProfileAuraFrame';

interface MatchesViewProps {
  authToken: string;
  onOpenChat: (userId: string) => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({ authToken, onOpenChat }) => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/matches', { headers });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      const data = await res.json();
      if (data && Array.isArray(data.matches)) {
        setMatches(data.matches);
      }
    } catch (err) {
      console.warn('Fetch matches notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [authToken]);

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 pt-1 px-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-rose-600 to-fuchsia-600 shadow-md shadow-rose-950/60">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <h2 className="text-base font-extrabold text-white tracking-wide">Conexiones Mutuas</h2>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">{matches.length} matches</span>
      </div>

      {loading ? (
        <div className="space-y-2 pt-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.08] bg-[#0e101b]/70 backdrop-blur-xl p-8 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600/20 to-fuchsia-600/20 border border-rose-500/30 flex items-center justify-center mx-auto">
            <Flame className="w-6 h-6 text-rose-500" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">Aún no tienes matches</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Sigue explorando la cuadrícula de perfiles en Discover para conectar con personas con tus mismos gustos.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {matches.map(m => {
            const p = m.matchedProfile;
            if (!p) return null;
            return (
              <div
                key={m.id}
                onClick={() => onOpenChat(p.userId)}
                className="aura-glass-card flex items-center justify-between p-3.5 rounded-2xl border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl hover:border-rose-500/40 hover:shadow-[0_8px_24px_-4px_rgba(244,63,94,0.18)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group active:scale-[0.99] shadow-lg shadow-black/40"
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <ProfileAuraFrame
                      isOnline={p.isOnline}
                      className="w-12 h-12 rounded-full"
                    >
                      <img
                        src={p.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                        alt={p.displayName}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </ProfileAuraFrame>
                    {p.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0d0f1b] shadow-[0_0_6px_rgba(52,211,153,0.8)] z-10" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                        {p.displayName}, {p.age}
                      </h3>
                      {p.verified && (
                        <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.35)] shrink-0" title="Verificado">
                          <ShieldCheck className="w-3 h-3 stroke-[2.4]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-rose-300/90 font-semibold mt-0.5">
                      {p.identityRole} <span className="text-slate-500">·</span> {p.location}
                    </p>
                  </div>
                </div>

                <button
                  className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600/20 to-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 hover:border-fuchsia-500/60 hover:shadow-[0_0_14px_rgba(217,70,239,0.3)] hover:scale-105 active:scale-95 transition-all duration-200"
                  title="Abrir chat"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
