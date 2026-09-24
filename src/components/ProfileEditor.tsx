import React, { useState, useRef } from 'react';
import { UserProfile, SexualRole, Tribe, LookingFor } from '../types';
import { Camera, Plus, Trash2, Check, Image as ImageIcon, ExternalLink, ChevronDown, ChevronUp, Tag, Sparkles, Upload, Loader2, AlertCircle, Lock, Unlock, Zap, Shield, Settings, ChevronRight, Link2 } from 'lucide-react';
import { AURA_ALBUM_PHOTOS, GOOGLE_PHOTOS_ALBUM_URL } from '../data/auraAlbum';
import { ImportAlbumModal } from './ImportAlbumModal';
import { auth } from '../lib/firebase';
import { saveProfileToFirestore } from '../services/firebaseService';

interface ProfileEditorProps {
  profile: UserProfile;
  authToken: string;
  onProfileUpdated: (updated: UserProfile) => void;
  onOpenSettings?: () => void;
}

const ROLES: SexualRole[] = ['Top', 'Vers Top', 'Versatile', 'Vers Bottom', 'Bottom', 'Side', 'Unspecified'];
const TRIBES: Tribe[] = ['Bear', 'Otter', 'Cub', 'Jock', 'Twink', 'Geek', 'Daddy', 'Leather', 'Clean Cut', 'Muscle', 'Trans', 'Queer', 'Pup'];
const LOOKING_FOR: LookingFor[] = ['Dating', 'Hookups', 'Friends', 'Networking', 'Relationship', 'Right Now', 'Chat'];

export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile,
  authToken,
  onProfileUpdated,
  onOpenSettings
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validations
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid format. Please select a JPG, PNG, WEBP, or GIF image.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image exceeds the 8 MB maximum size limit.');
      return;
    }

    if (photos.length >= 6) {
      setUploadError('Gallery limit reached (max 6 photos). Remove one to upload.');
      return;
    }

    setUploadingPhoto(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('media', file);

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      const newPhoto = {
        id: `ph-upload-${Date.now()}`,
        url: data.media.url,
        isPrimary: photos.length === 0
      };

      setPhotos(prev => [...prev, newPhoto]);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

  const togglePhotoPrivate = (id: string) => {
    setPhotos(photos.map(p => {
      if (p.id === id) {
        return { ...p, isPrivate: !p.isPrivate };
      }
      return p;
    }));
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
    setSaveError(null);

    try {
      const updates = {
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
      };
      if (auth.currentUser && auth.currentUser.uid === profile.userId) {
        const savedProfile = await saveProfileToFirestore(auth.currentUser.uid, { ...profile, ...updates });
        onProfileUpdated(savedProfile);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        return;
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.profile) throw new Error(data.error || 'Nie udało się zapisać profilu.');
      onProfileUpdated(data.profile);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save profile error:', err);
      setSaveError(err?.message || 'Nie udało się zapisać profilu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 pt-1 px-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-extrabold text-white tracking-wide">Edit Profile</h2>
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm animate-pulse-green">
              <Check className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
          {saveError && <span role="alert" className="text-xs text-rose-300">{saveError}</span>}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-500/50 text-xs font-bold transition active:scale-95 shadow-sm"
              title="Przejdź do Ustawień"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span>Ustawienia</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Settings Access Card */}
      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full p-3.5 rounded-2xl aura-glass-card border border-white/10 hover:border-purple-500/40 bg-[#0d0f1b]/80 hover:bg-[#131627] flex items-center justify-between transition-all group active:scale-[0.99] shadow-lg text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <Settings className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                <span>Centrum Ustawień i Prywatności</span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">Konto</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Prywatność, bezpieczeństwo, subskrypcja, RODO/DSA i wylogowanie
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      <form onSubmit={handleSave} className="space-y-3.5">
        
        {/* Photo Gallery Editor */}
        <div className="aura-glass-card rounded-[26px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4.5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-fuchsia-400" />
              <span>Gallery ({photos.length}/6)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="text-[11px] font-semibold text-purple-300 hover:text-white flex items-center gap-1 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded-full transition active:scale-95 shadow-sm"
              >
                <Link2 className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Importuj z linku</span>
              </button>
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
              <div key={p.id} className={`relative aspect-square rounded-2xl overflow-hidden border bg-black group shadow-md transition-all ${
                p.isPrivate ? 'border-amber-500/60 ring-1 ring-amber-500/40' : 'border-white/10'
              }`}>
                <img src={p.url} alt="Profile photo" referrerPolicy="no-referrer" className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                  p.isPrivate ? 'brightness-90' : ''
                }`} />
                
                {/* Private Vault Badge */}
                {p.isPrivate && (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/40 flex items-center gap-1 text-[9px] font-bold text-amber-300 shadow-sm">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Skarbiec</span>
                  </div>
                )}

                {/* Private / Public Toggle */}
                <button
                  type="button"
                  title={p.isPrivate ? "Prywatne zdjęcie (Skarbiec) - kliknij aby odblokować dla wszystkich" : "Kliknij aby ukryć w prywatnym skarbcu"}
                  onClick={() => togglePhotoPrivate(p.id)}
                  className={`absolute bottom-1.5 left-1.5 p-1.5 rounded-full backdrop-blur-md transition active:scale-90 ${
                    p.isPrivate
                      ? 'bg-amber-500/90 text-black hover:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-black/70 text-slate-300 hover:text-white hover:bg-black/90'
                  }`}
                >
                  {p.isPrivate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>

                {/* Remove button */}
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

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <strong>Prywatny Skarbiec:</strong> Kliknij ikonę kłódki na zdjęciu, aby przenieść je do skarbca. Zdjęcia ze skarbca widzą tylko osoby, którym osobiście przyznasz dostęp w czacie.
            </span>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Real Media Upload Button (Mobile Camera & Gallery) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto || photos.length >= 6}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-purple-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-95"
            >
              {uploadingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading securely...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Photo (Camera / Gallery)</span>
                </>
              )}
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Or paste an Image URL..."
              value={newPhotoUrl}
              onChange={e => setNewPhotoUrl(e.target.value)}
              className="flex-1 aura-glass-input rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition"
            />
            <button
              type="button"
              onClick={handleAddPhoto}
              className="aura-btn-primary px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-purple-950/50 transition"
            >
              Add URL
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
        <div className="aura-glass-card rounded-[26px] border border-white/[0.08] bg-[#0d0f1b]/70 backdrop-blur-xl p-4.5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Looking For</label>
            <button
              type="button"
              onClick={() => toggleLookingFor('Right Now')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide border transition-all active:scale-95 ${
                lookingFor.includes('Right Now')
                  ? 'border-amber-400/80 bg-gradient-to-r from-amber-500/30 to-fuchsia-500/30 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.35)] animate-pulse'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Right Now {lookingFor.includes('Right Now') ? 'WŁĄCZONE' : 'WYŁĄCZONE'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {LOOKING_FOR.map(l => {
              const isRightNow = l === 'Right Now';
              const isSelected = lookingFor.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLookingFor(l)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1 ${
                    isSelected
                      ? isRightNow
                        ? 'border-amber-400 bg-amber-500/25 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                        : 'border-rose-500/60 bg-rose-500/20 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white'
                  }`}
                >
                  {isRightNow && <Zap className="w-3 h-3 text-amber-400" />}
                  <span>{l}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full relative py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 bg-[length:200%_auto] text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-purple-950/60 hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 animate-breathe-glow"
        >
          {saving ? 'Saving Profile...' : 'Save Changes'}
        </button>

        {onOpenSettings && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full py-2.5 px-4 rounded-xl border border-white/10 hover:border-purple-500/30 bg-white/[0.03] hover:bg-purple-500/10 text-xs font-semibold text-slate-400 hover:text-purple-300 flex items-center justify-center gap-2 transition active:scale-[0.99]"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span>Przejdź do pełnych ustawień konta</span>
            </button>
          </div>
        )}

      </form>

      {/* Album Import Modal (iCloud & Google Photos) */}
      <ImportAlbumModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        authToken={authToken}
        currentPhotoCount={photos.length}
        onPhotosImported={(newPhotos) => {
          setPhotos(newPhotos);
          onProfileUpdated({
            ...profile,
            photos: newPhotos
          });
          setShowImportModal(false);
        }}
      />
    </div>
  );
};
