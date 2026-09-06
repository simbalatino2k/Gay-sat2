import React, { useState, useEffect, useRef } from 'react';
import { Moment, UserAccount, MomentPrivacy, MomentMediaType } from '../types';
import { Plus, Heart, Eye, Lock, Globe, Users, X, Send, Trash2, Camera, Film, Sparkles, Clock, Volume2, VolumeX, Image as ImageIcon } from 'lucide-react';
import { AURA_ALBUM_PHOTOS } from '../data/auraAlbum';
import { ProfileAuraFrame } from './ProfileAuraFrame';
import { AuraMomentsHourglassGraphic } from './AuraGraphics';

interface MomentsViewProps {
  currentUser: UserAccount;
  authToken: string;
  onOpenChat: (targetUserId: string) => void;
}

export const MomentsView: React.FC<MomentsViewProps> = ({
  currentUser,
  authToken,
  onOpenChat
}) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMomentIndex, setActiveMomentIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Moment Form State
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<MomentMediaType>('photo');
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<MomentPrivacy>('everyone');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Viewer State
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMoments = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/moments', { headers });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      const data = await res.json();
      if (data && Array.isArray(data.moments)) {
        setMoments(data.moments);
      }
    } catch (err) {
      console.warn('Fetch moments notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoments();
  }, [authToken]);

  // Story playback timer
  useEffect(() => {
    if (activeMomentIndex === null || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Record view on open
    const currentMom = moments[activeMomentIndex];
    if (currentMom) {
      fetch(`/api/moments/${currentMom.id}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      }).catch(() => {});
    }

    setProgress(0);
    const interval = 50; // update progress every 50ms
    const totalDuration = 5000; // 5 seconds per story
    const step = (interval / totalDuration) * 100;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Advance to next moment or exit
          if (activeMomentIndex < moments.length - 1) {
            setActiveMomentIndex(activeMomentIndex + 1);
            return 0;
          } else {
            setActiveMomentIndex(null);
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeMomentIndex, isPaused, moments, authToken]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/moments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          mediaUrl: mediaUrl.trim(),
          mediaType,
          caption: caption.trim(),
          privacy,
          allowedUserIds: selectedUserIds
        })
      });
      const data = await res.json();
      if (data.moment) {
        fetchMoments();
        setShowCreateModal(false);
        setMediaUrl('');
        setCaption('');
      }
    } catch (err) {
      console.error('Create moment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (momentId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/moments/${momentId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setMoments(prev => prev.map(m => {
        if (m.id === momentId) {
          return { ...m, hasLiked: data.liked, likesCount: data.count };
        }
        return m;
      }));
    } catch (err) {
      console.error('Like moment error:', err);
    }
  };

  const handleDelete = async (momentId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await fetch(`/api/moments/${momentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      fetchMoments();
      setActiveMomentIndex(null);
    } catch (err) {
      console.error('Delete moment error:', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeMomentIndex === null || !replyText.trim()) return;
    const currentMom = moments[activeMomentIndex];
    if (!currentMom) return;

    setSendingReply(true);
    try {
      await fetch(`/api/moments/${currentMom.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          text: replyText.trim(),
          targetUserId: currentMom.userId
        })
      });
      setReplyText('');
      setActiveMomentIndex(null);
      onOpenChat(currentMom.userId);
    } catch (err) {
      console.error('Reply error:', err);
    } finally {
      setSendingReply(false);
    }
  };

  // Sample media presets for quick demo sharing from Google Photos Aura album
  const PRESET_PHOTOS = [
    { name: 'Aura Portrait 1', url: AURA_ALBUM_PHOTOS[0] },
    { name: 'Aura Studio 2', url: AURA_ALBUM_PHOTOS[1] },
    { name: 'Aura Urban 3', url: AURA_ALBUM_PHOTOS[2] },
    { name: 'Aura Sunset 4', url: AURA_ALBUM_PHOTOS[3] },
    { name: 'Aura Style 5', url: AURA_ALBUM_PHOTOS[4] },
    { name: 'Aura Modern 6', url: AURA_ALBUM_PHOTOS[5] }
  ];

  const currentMom = activeMomentIndex !== null ? moments[activeMomentIndex] : null;

  return (
    <div className="w-full max-w-md mx-auto space-y-5 pb-24 pt-2 px-3">
      
      {/* Header Title */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fuchsia-400" />
          <h2 className="text-lg font-black text-white tracking-wide">24h Moments</h2>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
          <Clock className="w-3 h-3" />
          Auto Disappears
        </span>
      </div>

      {/* Top Story Avatar Carousel & Add Action */}
      <div className="aura-glass-card rounded-[28px] border border-white/[0.08] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Stories</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 text-xs font-bold text-fuchsia-400 hover:text-fuchsia-300 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Moment</span>
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {/* Post New Story Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex flex-col items-center gap-1.5 shrink-0 group active:scale-95 transition-transform"
          >
            <div className="relative w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-fuchsia-500/50 group-hover:border-fuchsia-400 transition flex items-center justify-center bg-black/40 shadow-md">
              <img
                src={currentUser.profile.photos[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                alt="My Avatar"
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                <Plus className="w-5 h-5 text-white bg-gradient-to-tr from-purple-600 to-fuchsia-600 rounded-full p-1 shadow-lg shadow-fuchsia-900/60 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-300">Your Moment</span>
          </button>

          {/* Story List Items */}
          {moments.map((mom, idx) => (
            <button
              key={mom.id}
              onClick={() => setActiveMomentIndex(idx)}
              className="flex flex-col items-center gap-1.5 shrink-0 group active:scale-95 transition-transform"
            >
              <ProfileAuraFrame
                isOnline={true}
                className="w-16 h-16 rounded-full group-hover:scale-105 transition-transform"
              >
                <img
                  src={mom.creatorProfile?.photos[0]?.url || mom.mediaUrl}
                  alt={mom.creatorProfile?.displayName || 'Creator'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                />
              </ProfileAuraFrame>
              <span className="text-[10px] font-semibold text-slate-300 truncate w-16 text-center">
                {mom.userId === currentUser.id ? 'You' : mom.creatorProfile?.displayName || 'Member'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid View of Moments Feed */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">24-Hour Gallery</h3>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Loading ephemeral moments...
          </div>
        ) : moments.length === 0 ? (
          <div className="rounded-[28px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-8 text-center space-y-3 shadow-xl">
            <div className="flex items-center justify-center mx-auto">
              <AuraMomentsHourglassGraphic className="w-16 h-16" />
            </div>
            <p className="text-xs font-semibold text-slate-200">No active moments right now.</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Be the first to share an ephemeral 24-hour photo or clip with your circle.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-rose-500 text-xs font-bold text-white shadow-lg shadow-purple-950/50 hover:brightness-110 active:scale-95 transition"
            >
              Post Moment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {moments.map((mom, idx) => (
              <div
                key={mom.id}
                onClick={() => setActiveMomentIndex(idx)}
                className="aura-glass-card relative aspect-[3/4] rounded-[24px] overflow-hidden border border-white/[0.09] bg-[#0c0e18] group cursor-pointer shadow-xl shadow-black/70 transition-all duration-300 ease-out hover:scale-[1.015] hover:border-fuchsia-500/40 hover:shadow-[0_16px_36px_-8px_rgba(217,70,239,0.22),0_0_1px_1px_rgba(255,255,255,0.08)_inset] active:scale-[0.985]"
              >
                <img
                  src={mom.mediaUrl}
                  alt="Moment media"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                {/* Soft Top Scrim */}
                <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                
                {/* Overlay Top Bar */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                  <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-md">
                    <img
                      src={mom.creatorProfile?.photos[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                      alt="Creator"
                      referrerPolicy="no-referrer"
                      className="w-3.5 h-3.5 rounded-full object-cover"
                    />
                    <span className="text-[9.5px] font-bold text-white truncate max-w-[80px]">
                      {mom.creatorProfile?.displayName || 'User'}
                    </span>
                  </div>

                  <span className="bg-black/65 backdrop-blur-md p-1 rounded-full text-slate-300 border border-white/10 shadow-md">
                    {mom.privacy === 'everyone' && <Globe className="w-3 h-3 text-cyan-400" />}
                    {mom.privacy === 'connections' && <Users className="w-3 h-3 text-fuchsia-400" />}
                    {mom.privacy === 'specific' && <Lock className="w-3 h-3 text-amber-400" />}
                  </span>
                </div>

                {/* Overlay Bottom Caption & Like Button */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06070c] via-[#06070c]/60 to-transparent p-3 pt-8 flex items-end justify-between">
                  <p className="text-[11px] font-medium text-white line-clamp-2 leading-tight pr-2 drop-shadow-sm">
                    {mom.caption || '24h Moment'}
                  </p>
                  <button
                    onClick={(e) => handleLike(mom.id, e)}
                    className={`p-2 rounded-xl backdrop-blur-md border transition-all duration-200 active:scale-90 ${
                      mom.hasLiked
                        ? 'bg-rose-500/25 border-rose-500/60 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                        : 'bg-black/50 border-white/15 text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${mom.hasLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MOMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 transition-opacity duration-300">
          <div className="aura-glass-modal animate-modal-enter w-full max-w-sm rounded-[32px] border border-white/[0.12] bg-[#0c0e18]/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_1px_1px_rgba(255,255,255,0.08)_inset] space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-black text-white tracking-wide">Create 24h Moment</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 transition-all duration-200 active:scale-90 shadow-md"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.4]" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              
              {/* Media Type Toggle */}
              <div className="flex rounded-2xl bg-black/40 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMediaType('photo')}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition ${
                    mediaType === 'photo' ? 'bg-fuchsia-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('video')}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition ${
                    mediaType === 'video' ? 'bg-fuchsia-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Video Clip</span>
                </button>
              </div>

              {/* Preset Shortcuts */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">Sample Photo Shortcuts</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRESET_PHOTOS.map(p => (
                    <button
                      key={p.url}
                      type="button"
                      onClick={() => setMediaUrl(p.url)}
                      className="p-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-fuchsia-500/50 text-[10px] font-medium text-slate-300 text-left truncate"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media URL Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Media URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-fuchsia-500"
                />
              </div>

              {/* Live Preview */}
              {mediaUrl.trim() && (
                <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black relative">
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Caption */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Caption / Message</label>
                <input
                  type="text"
                  placeholder="Share a story or mood..."
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-fuchsia-500"
                />
              </div>

              {/* Privacy Controls */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200">Privacy & Audience Controls</label>
                
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPrivacy('everyone')}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-start gap-3 transition ${
                      privacy === 'everyone'
                        ? 'border-fuchsia-500 bg-fuchsia-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-white">Everyone</div>
                      <div className="text-[10px] text-slate-400">Visible to all active community members</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacy('connections')}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-start gap-3 transition ${
                      privacy === 'connections'
                        ? 'border-fuchsia-500 bg-fuchsia-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <Users className="w-4 h-4 text-fuchsia-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-white">Connections Only</div>
                      <div className="text-[10px] text-slate-400">Visible only to mutual matches & connections</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivacy('specific')}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-start gap-3 transition ${
                      privacy === 'specific'
                        ? 'border-fuchsia-500 bg-fuchsia-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-white">Specific Connections</div>
                      <div className="text-[10px] text-slate-400">Restricted to selected accounts only</div>
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !mediaUrl.trim()}
                className="aura-btn-primary w-full py-3.5 rounded-2xl text-xs font-bold text-white shadow-xl shadow-fuchsia-950/50 flex items-center justify-center transition-all duration-200"
              >
                {isSubmitting ? 'Publishing...' : 'Publish 24h Moment'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* FULL SCREEN IMMERSIVE STORY VIEWER MODAL */}
      {currentMom && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-3 select-none animate-in fade-in duration-200"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Header Progress Bar & Profile Bar */}
          <div className="space-y-3 z-10 pt-1 max-w-md mx-auto w-full">
            {/* Segmented Progress Bar */}
            <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-fuchsia-500 to-rose-500 h-full transition-all ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ProfileAuraFrame
                  isOnline={true}
                  className="w-10 h-10 rounded-full shrink-0"
                >
                  <img
                    src={currentMom.creatorProfile?.photos[0]?.url || currentMom.mediaUrl}
                    alt="Creator"
                    className="w-full h-full object-cover"
                  />
                </ProfileAuraFrame>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">
                      {currentMom.userId === currentUser.id ? 'You' : currentMom.creatorProfile?.displayName || 'Member'}
                    </span>
                    {currentMom.creatorProfile?.verified && (
                      <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-cyan-500/30">
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>24h Moment</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentMom.userId === currentUser.id && (
                  <button
                    onClick={(e) => handleDelete(currentMom.id, e)}
                    className="p-2 rounded-full bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
                    title="Delete Moment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setActiveMomentIndex(null)}
                  className="p-2 rounded-full bg-black/60 text-white hover:bg-white/20 transition border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Center Immersive Media Player */}
          <div className="relative flex-1 my-3 rounded-3xl overflow-hidden bg-black flex items-center justify-center max-w-md mx-auto w-full shadow-2xl">
            {currentMom.mediaType === 'video' ? (
              <video
                src={currentMom.mediaUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={currentMom.mediaUrl}
                alt="Moment Story"
                className="w-full h-full object-cover"
              />
            )}

            {/* Mute/Sound Toggle for Video */}
            {currentMom.mediaType === 'video' && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}

            {/* Caption Overlay */}
            {currentMom.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-5 pt-12">
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {currentMom.caption}
                </p>
              </div>
            )}
          </div>

          {/* Footer Interactive Bar */}
          <div className="z-10 max-w-md mx-auto w-full space-y-2">
            
            {currentMom.userId !== currentUser.id ? (
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${currentMom.creatorProfile?.displayName || 'story'}...`}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-fuchsia-500 backdrop-blur-md"
                />

                <button
                  type="button"
                  onClick={(e) => handleLike(currentMom.id, e)}
                  className={`p-2.5 rounded-full border backdrop-blur-md transition ${
                    currentMom.hasLiked
                      ? 'bg-rose-500/30 border-rose-500/50 text-rose-400'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${currentMom.hasLiked ? 'fill-rose-400' : ''}`} />
                </button>

                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="p-2.5 rounded-full bg-fuchsia-600 text-white font-bold hover:bg-fuchsia-500 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white">{currentMom.viewsCount} Views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-white">{currentMom.likesCount} Likes</span>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
