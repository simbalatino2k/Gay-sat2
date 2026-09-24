import React from 'react';
import { FilterState, SexualRole, Tribe, LookingFor } from '../types';
import { X, Check, MapPin } from 'lucide-react';
import { formatDistance } from '../utils/formatDistance';
import { t, labelRole, labelTribe, labelLookingFor } from '../i18n';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filter: FilterState;
  onApply: (updated: FilterState) => void;
}

const ROLES: SexualRole[] = ['Top', 'Vers Top', 'Versatile', 'Vers Bottom', 'Bottom', 'Side', 'Unspecified'];
const TRIBES: Tribe[] = ['Bear', 'Otter', 'Cub', 'Jock', 'Twink', 'Geek', 'Daddy', 'Leather', 'Clean Cut', 'Muscle', 'Trans', 'Queer', 'Pup'];
const LOOKING_FOR: LookingFor[] = ['Dating', 'Hookups', 'Friends', 'Networking', 'Relationship', 'Right Now', 'Chat'];

export const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  onClose,
  filter,
  onApply
}) => {
  const [local, setLocal] = React.useState<FilterState>(filter);

  if (!isOpen) return null;

  const toggleRole = (role: SexualRole) => {
    const roles = local.roles.includes(role)
      ? local.roles.filter(r => r !== role)
      : [...local.roles, role];
    setLocal({ ...local, roles });
  };

  const toggleTribe = (tribe: Tribe) => {
    const tribes = local.tribes.includes(tribe)
      ? local.tribes.filter(t => t !== tribe)
      : [...local.tribes, tribe];
    setLocal({ ...local, tribes });
  };

  const toggleLooking = (item: LookingFor) => {
    const lookingFor = local.lookingFor.includes(item)
      ? local.lookingFor.filter(l => l !== item)
      : [...local.lookingFor, item];
    setLocal({ ...local, lookingFor });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 transition-opacity duration-300">
      <div className="aura-glass-modal animate-modal-enter w-full max-w-md rounded-[32px] border border-white/[0.12] bg-[#0c0e18]/95 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_1px_1px_rgba(255,255,255,0.08)_inset] flex flex-col justify-between space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-black text-white tracking-wide">{t('Discovery Filters')}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 transition-all duration-200 active:scale-90 shadow-md"
              title={t('Close')}
            >
              <X className="w-4 h-4 stroke-[2.4]" />
            </button>
          </div>

          {/* Proximity / Distance Filter */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>{t('Maximum Distance')}</span>
              </span>
              <span className="text-fuchsia-400 font-bold">
                {local.maxDistanceKm ? formatDistance(local.maxDistanceKm) : t('All distances')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                { label: `15m ${t('far')}`, val: 0.02 },
                { label: `30m ${t('far')}`, val: 0.045 },
                { label: '150m', val: 0.2 },
                { label: '500m', val: 0.5 },
                { label: '5 km', val: 5 },
                { label: '25 km', val: 25 },
                { label: t('All'), val: 0 }
              ].map(preset => {
                const isSelected = (!local.maxDistanceKm && preset.val === 0) || (local.maxDistanceKm === preset.val);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setLocal({ ...local, maxDistanceKm: preset.val })}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all duration-200 ${
                      isSelected
                        ? 'border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.3)]'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age Range */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-300">
              <span>{t('Age Range')}</span>
              <span className="text-purple-400">{local.minAge} - {local.maxAge} {t('yrs')}</span>
            </div>
            <div className="flex gap-3">
              <input
                type="range"
                min={18}
                max={60}
                value={local.minAge}
                onChange={e => setLocal({ ...local, minAge: Number(e.target.value) })}
                className="w-full accent-purple-500"
              />
              <input
                type="range"
                min={local.minAge}
                max={80}
                value={local.maxAge}
                onChange={e => setLocal({ ...local, maxAge: Number(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>
          </div>

          {/* Sexual Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">{t('Position / Sexual Role')}</label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => toggleRole(r)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                    local.roles.includes(r)
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  {labelRole(r)}
                </button>
              ))}
            </div>
          </div>

          {/* Tribes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">{t('Tribes')}</label>
            <div className="flex flex-wrap gap-1.5">
              {TRIBES.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTribe(t)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                    local.tribes.includes(t)
                      ? 'border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-300'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  {labelTribe(t)}
                </button>
              ))}
            </div>
          </div>

          {/* Looking For */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">{t('Looking For')}</label>
            <div className="flex flex-wrap gap-1.5">
              {LOOKING_FOR.map(l => (
                <button
                  key={l}
                  onClick={() => toggleLooking(l)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                    local.lookingFor.includes(l)
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  {labelLookingFor(l)}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>{t('Online Now Only')}</span>
              <input
                type="checkbox"
                checked={local.onlineOnly}
                onChange={e => setLocal({ ...local, onlineOnly: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 accent-purple-500"
              />
            </label>
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>{t('Verified Profiles Only')}</span>
              <input
                type="checkbox"
                checked={local.verifiedOnly}
                onChange={e => setLocal({ ...local, verifiedOnly: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 accent-purple-500"
              />
            </label>
          </div>
        </div>

        <button
          onClick={() => {
            onApply(local);
            onClose();
          }}
          className="aura-btn-primary w-full py-3.5 rounded-2xl text-xs font-bold text-white shadow-xl shadow-fuchsia-950/50 flex items-center justify-center transition-all duration-200"
        >
          {t('Apply Filters')}
        </button>
      </div>
    </div>
  );
};
