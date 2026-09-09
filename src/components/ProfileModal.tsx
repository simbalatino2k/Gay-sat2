import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, Heart, MessageSquare, Sparkles, Flag, Ban, MapPin, ShieldCheck } from 'lucide-react';
import { formatDistanceDescriptive } from '../utils/formatDistance';
import { ProfileAuraFrame } from './ProfileAuraFrame';

interface ProfileModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  onLike: (profile: UserProfile) => void;
  onOpenChat: (userId: string, initialMessage?: string) => void;
  onReport: (profile: UserProfile, reason: string) => void;
  onBlock: (userId: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  authToken,
  onLike,
  onOpenChat,
  onReport,
  onBlock
}) => {
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [loadingIce, setLoadingIce] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  if (!isOpen || !profile) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-3 transition-opacity duration-300">
      <div className="aura-glass-modal animate-modal-enter w-full max-w-sm rounded-[32px] border border-white/[0.12] bg-[#0c0e18]/90 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_1px_1px_rgba(255,255,255,0.08)_inset] space-y-4 max-h-[92vh] overflow-y-auto relative custom-scrollbar">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/65 text-slate-300 hover:text-white hover:bg-white/[0.15] hover:border-white/25 backdrop-blur-xl border border-white/10 transition-all duration-200 active:scale-90 shadow-lg"
          title="Close"
        >
          <X className="w-4 h-4 stroke-[2.4]" />
        </button>

        {/* Photos / Primary Photo */}
        <ProfileAuraFrame
          isOnline={profile.isOnline}
          intensity="prominent"
          className="relative aspect-[3/4] rounded-[24px] shadow-2xl"
          innerClassName="bg-slate-950 border border-white/10"
        >
          <img
            src={profile.photos[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
            alt={profile.displayName}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06070c] via-[#06070c]/75 via-45% to-transparent p-4 pt-14 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">{profile.displayName}, {profile.age}</h2>
              {profile.verified && (
                <span className="flex items-center gap-1 bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.35)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.4]" />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>
                {profile.location && profile.location !== 'Global' && profile.location !== 'Global Member' ? `${profile.location} · ` : ''}
                <strong className="text-fuchsia-300 font-semibold">{formatDistanceDescriptive(profile.distanceKm)}</strong>
              </span>
            </div>
          </div>
        </ProfileAuraFrame>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onLike(profile)}
            className="aura-btn-primary flex-1 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-fuchsia-950/50"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>Send Like</span>
          </button>
          <button
            onClick={() => { onClose(); onOpenChat(profile.userId); }}
            className="flex-1 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-bold text-white flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-cyan-300" />
            <span>Message</span>
          </button>
        </div>

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

      </div>
    </div>
  );
};
