import React, { useState } from 'react';
import { UserProfile, SexualRole, Tribe, LookingFor } from '../types';
import { Camera, Plus, Trash2, Check, Image as ImageIcon, ExternalLink, ChevronDown, ChevronUp, Tag, Sparkles } from 'lucide-react';
import { AURA_ALBUM_PHOTOS, GOOGLE_PHOTOS_ALBUM_URL } from '../data/auraAlbum';

interface ProfileEditorProps {
  profile: UserProfile;
  authToken: string;
  onProfileUpdated: (updated: UserProfile) => void;
}

const ROLES: SexualRole[] = ['Top', 'Vers Top', 'Versatile', 'Vers Bottom', 'Bottom', 'Side', 'Unspecified'];
const TRIBES: Tribe[] = ['Bear', 'Otter', 'Cub', 'Jock', 'Twink', 'Geek', 'Daddy', 'Leather', 'Clean Cut', 'Muscle', 'Trans', 'Queer', 'Pup'];
const LOOKING_FOR: LookingFor[] = ['Dating', 'Hookups', 'Friends', 'Networking', 'Relationship', 'Right Now', 'Chat'];

export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile,
  authToken,
  onProfileUpdated
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [age, setAge] = useState(profile.age);
  const [identityRole, setIdentityRole] = useState<SexualRole>(profile.identityRole);
  const [location, setLocation] = useState(profile.location);
  const [bio, setBio] = useState(profile.bio);
  const [instagramHandle, setInstagramHandle] = useState(profile.instagramHandle || '');
  const [spotifyTopArtist, setSpotifyTopArtist] = useState(profile.spotifyTopArtist || '');

  // Enhanced Customization
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [lookingFor, setLookingFor] = useState<LookingFor[]>(profile.lookingFor || []);
  const [tribes, setTribes] = useState<Tribe[]>(profile.tribes || []);

  const [photos, setPhotos] = useState(profile.photos || []);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim().replace(/^#/, '');
    if (!interests.includes(tag)) {
      setInterests([...interests, tag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setInterests(interests.filter(i => i !== tag));
  };

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    const newPh = {
      id: `ph-${Date.now()}`,
      url: newPhotoUrl.trim(),
      isPrimary: photos.length === 0
    };
    setPhotos([...photos, newPh]);
    setNewPhotoUrl('');
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const toggleLookingFor = (item: LookingFor) => {
    setLookingFor(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleTribe = (t: Tribe) => {
    setTribes(prev =>
      prev.includes(t) ? prev.filter(item => item !== t) : [...prev, t]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          displayName,
          age,
          identityRole,
          location,
          bio,
          instagramHandle,
          spotifyTopArtist,
          interests,
          lookingFor,
          tribes,
          photos
        })
      });
      const data = await res.json();
      if (data.profile) {
        onProfileUpdated(data.profile);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 pt-1 px-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-extrabold text-white tracking-wide">Edit Profile</h2>
        {savedSuccess && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm animate-pulse-green">
            <Check className="w-3.5 h-3.5" /> Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-3.5">
        
        {/* Photo Gallery Editor */}
        <div className="aura-glass-card rounded-[26px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4.5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-fuchsia-400" />
              <span>Gallery ({photos.length}/6)</span>
            </label>
            <button
              type="button"
              onClick={() => setShowAlbumPicker(!showAlbumPicker)}
              className="text-[11px] font-semibold text-fuchsia-300 hover:text-white flex items-center gap-1 bg-fuchsia-950/40 border border-fuchsia-500/30 px-2.5 py-1 rounded-full transition active:scale-95 shadow-sm"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>AURA Album</span>
              {showAlbumPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Google Photos Album Picker Dropdown */}
          {showAlbumPicker && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Tap a photo to add it
                </span>
                <a
                  href={GOOGLE_PHOTOS_ALBUM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-amber-400/80 hover:text-amber-300 flex items-center gap-0.5 underline"
                >
                  <span>View Full Album</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {AURA_ALBUM_PHOTOS.map((url, idx) => {
                  const isAdded = photos.some(p => p.url === url);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAdded}
                      onClick={() => {
                        if (!isAdded && photos.length < 6) {
                          setPhotos([...photos, { id: `ph-${Date.now()}-${idx}`, url, isPrimary: photos.length === 0 }]);
                        }
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border transition group ${
                        isAdded ? 'border-emerald-500/50 opacity-40 cursor-not-allowed' : 'border-white/20 hover:border-fuchsia-400 hover:scale-105 active:scale-95'
                      }`}
                    >
                      <img src={url} alt={`Album photo ${idx}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      {isAdded && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {photos.map(p => (
              <div key={p.id} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black group shadow-md">
                <img src={p.url} alt="Profile photo" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(p.id)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 backdrop-blur-md text-rose-400 hover:text-white transition active:scale-90"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Image URL..."
              value={newPhotoUrl}
              onChange={e => setNewPhotoUrl(e.target.value)}
              className="flex-1 aura-glass-input rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition"
            />
            <button
              type="button"
              onClick={handleAddPhoto}
              className="aura-btn-primary px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-purple-950/50 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="aura-glass-card rounded-[26px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4.5 space-y-3 shadow-xl">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full aura-glass-input rounded-xl px-3 py-2 text-xs text-white outline-none transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Age (18+)</label>
              <input
                type="number"
                min={18}
                max={99}
                required
                value={age}
                onChange={e => setAge(Number(e.target.value))}
                className="w-full aura-glass-input rounded-xl px-3 py-2 text-xs text-white outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full aura-glass-input rounded-xl px-3 py-2 text-xs text-white outline-none transition"
            />
          </div>

          {/* Position Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Role / Position</label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setIdentityRole(r)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                    identityRole === r
                      ? 'border-purple-500/60 bg-purple-500/20 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Short Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us a little bit about yourself..."
              className="w-full aura-glass-input rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none resize-none transition"
            />
          </div>
        </div>

        {/* Interests & Tags */}
        <div className="aura-glass-card rounded-[26px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4.5 space-y-3 shadow-xl">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-purple-400" />
            <span>Interests & Tags</span>
          </label>

          <div className="flex flex-wrap gap-1.5">
            {interests.map(t => (
              <span
                key={t}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-200 font-medium shadow-sm"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="text-purple-400 hover:text-rose-400 transition"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add tag (#cinema, #techno)..."
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
              className="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-fuchsia-500 transition"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3.5 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-xs font-bold text-white shadow-md active:scale-95 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Tribes */}
        <div className="aura-glass-card rounded-[26px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4.5 space-y-2 shadow-xl">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Tribes & Style</label>
          <div className="flex flex-wrap gap-1.5">
            {TRIBES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTribe(t)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                  tribes.includes(t)
                    ? 'border-fuchsia-500/60 bg-fuchsia-500/20 text-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.25)]'
                    : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Looking For */}
        <div className="aura-glass-card rounded-[26px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4.5 space-y-2 shadow-xl">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Looking For</label>
          <div className="flex flex-wrap gap-1.5">
            {LOOKING_FOR.map(l => (
              <button
                key={l}
                type="button"
                onClick={() => toggleLookingFor(l)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                  lookingFor.includes(l)
                    ? 'border-rose-500/60 bg-rose-500/20 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                    : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full relative py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 bg-[length:200%_auto] text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-purple-950/60 hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 animate-breathe-glow"
        >
          {saving ? 'Saving Profile...' : 'Save Changes'}
        </button>

      </form>
    </div>
  );
};
