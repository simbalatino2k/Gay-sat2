import React, { useState } from 'react';
import { SexualRole, Tribe, LookingFor, UserProfile } from '../../types';
import { Shield, Sparkles, User, Camera, ArrowRight, Check, MapPin, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '../../context/LanguageContext';

interface ProfileSetupRequiredModalProps {
  isOpen: boolean;
  currentUser: any;
  authToken: string;
  onCompleted: (updatedProfile: UserProfile) => void;
}

const ROLES: SexualRole[] = ['Top', 'Vers Top', 'Versatile', 'Vers Bottom', 'Bottom', 'Side', 'Unspecified'];
const TRIBES: Tribe[] = ['Bear', 'Otter', 'Cub', 'Jock', 'Twink', 'Geek', 'Daddy', 'Leather', 'Clean Cut', 'Muscle', 'Trans', 'Queer', 'Pup'];
const LOOKING_FOR: LookingFor[] = ['Dating', 'Hookups', 'Friends', 'Networking', 'Relationship', 'Right Now', 'Chat'];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800'
];

export const ProfileSetupRequiredModal: React.FC<ProfileSetupRequiredModalProps> = ({
  isOpen,
  currentUser,
  authToken,
  onCompleted
}) => {
  const { t } = useTranslation();

  const [displayName, setDisplayName] = useState(() => {
    return currentUser?.profile?.displayName || currentUser?.displayName || '';
  });
  const [age, setAge] = useState<number>(() => {
    const a = currentUser?.profile?.age;
    return typeof a === 'number' && a >= 18 ? a : 24;
  });
  const [identityRole, setIdentityRole] = useState<SexualRole>(() => {
    return currentUser?.profile?.identityRole || 'Versatile';
  });
  const [location, setLocation] = useState(() => {
    return currentUser?.profile?.location || 'Warszawa, Polska';
  });
  const [bio, setBio] = useState(() => {
    return currentUser?.profile?.bio || '';
  });
  const [selectedTribes, setSelectedTribes] = useState<Tribe[]>(() => {
    return currentUser?.profile?.tribes?.length ? currentUser.profile.tribes : ['Clean Cut'];
  });
  const [selectedLookingFor, setSelectedLookingFor] = useState<LookingFor[]>(() => {
    return currentUser?.profile?.lookingFor?.length ? currentUser.profile.lookingFor : ['Dating', 'Friends'];
  });
  const [photoUrl, setPhotoUrl] = useState<string>(() => {
    return currentUser?.profile?.photos?.[0]?.url || AVATAR_PRESETS[0];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleTribe = (tr: Tribe) => {
    if (selectedTribes.includes(tr)) {
      if (selectedTribes.length > 1) {
        setSelectedTribes(selectedTribes.filter(item => item !== tr));
      }
    } else {
      setSelectedTribes([...selectedTribes, tr]);
    }
  };

  const toggleLookingFor = (lf: LookingFor) => {
    if (selectedLookingFor.includes(lf)) {
      if (selectedLookingFor.length > 1) {
        setSelectedLookingFor(selectedLookingFor.filter(item => item !== lf));
      }
    } else {
      setSelectedLookingFor([...selectedLookingFor, lf]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Proszę podać nazwę wyświetlaną / imię.');
      return;
    }
    if (!photoUrl.trim()) {
      setError('Proszę wybrać zdjęcie profilowe.');
      return;
    }
    if (age < 18) {
      setError('Aplikacja AURA jest przeznaczona wyłącznie dla osób pełnoletnich (18+).');
      return;
    }

    setLoading(true);
    setError(null);

    const profileUpdates: Partial<UserProfile> = {
      displayName: displayName.trim(),
      age,
      identityRole,
      location: location.trim() || 'Nearby',
      bio: bio.trim(),
      tribes: selectedTribes,
      lookingFor: selectedLookingFor,
      photos: [
        {
          id: `photo-primary-${Date.now()}`,
          url: photoUrl.trim(),
          isPrimary: true
        }
      ]
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(profileUpdates)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Nie udało się zaktualizować profilu.');
      }

      const resData = await res.json();
      if (!resData?.profile) throw new Error('Serwer nie zwrócił zapisanego profilu.');
      const updatedProfile: UserProfile = resData.profile;

      setSuccess(true);
      setTimeout(() => {
        onCompleted(updatedProfile);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas zapisywania profilu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05060a]/95 backdrop-blur-2xl p-3 sm:p-4 overflow-y-auto custom-scrollbar">
      {/* Background Animated Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-fuchsia-600/15 rounded-full blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg aura-glass-card rounded-[28px] border border-fuchsia-500/30 bg-[#090b14]/95 p-5 sm:p-7 relative shadow-[0_20px_50px_rgba(0,0,0,0.85)] my-auto"
      >
        {/* Header */}
        <div className="text-center space-y-1.5 pb-4 border-b border-white/10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-fuchsia-600/30 border border-fuchsia-400/50 shadow-[0_0_15px_rgba(217,70,239,0.35)] mx-auto mb-1">
            <User className="w-6 h-6 text-fuchsia-300" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight bg-gradient-to-r from-purple-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
            {t('complete_profile_title', 'Uzupełnij swój profil AURA')}
          </h2>
          <p className="text-xs text-slate-300 max-w-sm mx-auto">
            {t('complete_profile_desc', 'Zanim przejdziesz do odkrywania radarów i czatów, uzupełnij swoje podstawowe dane i dodaj zdjęcie.')}
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Photo Selection Preview */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>{t('profile_photo', 'Zdjęcie profilowe')}</span>
              </span>
              <span className="text-[10px] text-fuchsia-300 font-semibold">{t('required', 'Wymagane')}</span>
            </label>

            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-fuchsia-400/60 shadow-[0_0_15px_rgba(217,70,239,0.4)] shrink-0 bg-black/40">
                <img
                  src={photoUrl || AVATAR_PRESETS[0]}
                  alt="Podgląd zdjęcia"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = AVATAR_PRESETS[0];
                  }}
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">Wybierz avatar:</span>
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setPhotoUrl(preset)}
                      className={`w-7 h-7 rounded-lg overflow-hidden border transition-all shrink-0 ${
                        photoUrl === preset
                          ? 'border-fuchsia-400 scale-105 shadow-[0_0_8px_rgba(217,70,239,0.6)]'
                          : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Name & Age Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 block">
                {t('display_name', 'Imię / Nazwa')}
              </label>
              <input
                type="text"
                required
                placeholder="np. Aleksander"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full aura-glass-input rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 block">
                {t('age', 'Wiek (18+)')}
              </label>
              <input
                type="number"
                min={18}
                max={99}
                required
                value={age}
                onChange={e => setAge(parseInt(e.target.value, 10) || 18)}
                className="w-full aura-glass-input rounded-xl px-3 py-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Role & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 block">
                {t('role_position', 'Rola')}
              </label>
              <select
                value={identityRole}
                onChange={e => setIdentityRole(e.target.value as SexualRole)}
                className="w-full aura-glass-input rounded-xl px-3 py-2.5 text-xs text-white outline-none bg-[#090b14]"
              >
                {ROLES.map(r => (
                  <option key={r} value={r} className="bg-slate-900 text-white">{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 block">
                {t('location', 'Miasto / Lokalizacja')}
              </label>
              <input
                type="text"
                required
                placeholder="np. Warszawa / Berlin"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full aura-glass-input rounded-xl px-3 py-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 block">
              {t('bio', 'O mnie (Bio)')}
            </label>
            <textarea
              rows={2}
              placeholder="Napisz parę słów o sobie..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full aura-glass-input rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-fuchsia-950/60 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Zapisywanie profilu...</span>
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                <span>Profil zapisany!</span>
              </>
            ) : (
              <>
                <span>Zapisz i wejdź do AURA</span>
                <ArrowRight className="w-4 h-4 text-cyan-200" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
