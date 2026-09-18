import React from 'react';
import { UserStatusMode } from '../types';
import { Flame, Plane, Sparkles, Coffee, Power, Zap, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface StatusModeConfig {
  mode: UserStatusMode;
  label: string;
  tagline: string;
  emoji: string;
  color: string;
  bgGrad: string;
  borderColor: string;
  textColor: string;
  icon: React.ElementType;
}

export const STATUS_MODE_CONFIGS: Record<UserStatusMode, StatusModeConfig> = {
  ONLINE: {
    mode: 'ONLINE',
    label: 'Online',
    tagline: 'Aktywny i dostępny do rozmowy',
    emoji: '🟢',
    color: 'emerald',
    bgGrad: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-300',
    icon: Zap
  },
  HOT_NOW: {
    mode: 'HOT_NOW',
    label: 'Hot Now',
    tagline: 'Gotowy na spotkanie tu i teraz',
    emoji: '🔥',
    color: 'rose',
    bgGrad: 'from-rose-600/25 via-pink-600/10 to-transparent',
    borderColor: 'border-rose-500/50',
    textColor: 'text-rose-300',
    icon: Flame
  },
  FLYING_MOOD: {
    mode: 'FLYING_MOOD',
    label: 'Flying Mood',
    tagline: 'Zwiedzam / podróżuję / wysoki vibe',
    emoji: '✈️',
    color: 'cyan',
    bgGrad: 'from-cyan-500/25 via-blue-500/10 to-transparent',
    borderColor: 'border-cyan-400/50',
    textColor: 'text-cyan-300',
    icon: Plane
  },
  DISPONIBLE: {
    mode: 'DISPONIBLE',
    label: 'Disponible',
    tagline: 'Otwarte drzwi na nowe znajomości',
    emoji: '✨',
    color: 'fuchsia',
    bgGrad: 'from-fuchsia-600/25 via-purple-600/10 to-transparent',
    borderColor: 'border-fuchsia-400/50',
    textColor: 'text-fuchsia-300',
    icon: Sparkles
  },
  CHILL: {
    mode: 'CHILL',
    label: 'Chill',
    tagline: 'Spokojna rozmowa bez pośpiechu',
    emoji: '☕',
    color: 'indigo',
    bgGrad: 'from-indigo-600/25 via-violet-600/10 to-transparent',
    borderColor: 'border-indigo-400/40',
    textColor: 'text-indigo-300',
    icon: Coffee
  },
  OFFLINE: {
    mode: 'OFFLINE',
    label: 'Offline (Niewidoczny)',
    tagline: 'Ukryj swój status online',
    emoji: '🌙',
    color: 'slate',
    bgGrad: 'from-slate-700/25 via-slate-800/10 to-transparent',
    borderColor: 'border-slate-600/40',
    textColor: 'text-slate-400',
    icon: Power
  }
};

interface StatusModeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode?: UserStatusMode;
  onSelectMode: (mode: UserStatusMode) => void;
  isSaving?: boolean;
}

export const StatusModeSheet: React.FC<StatusModeSheetProps> = ({
  isOpen,
  onClose,
  currentMode = 'ONLINE',
  onSelectMode,
  isSaving = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Sheet Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="w-full sm:max-w-md bg-[#0a0c14] border border-white/15 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative z-10 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar"
          >
            {/* Header Handle */}
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-2 mb-2 sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  Twój Tryb / AURA Status
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Wybierz jak jesteś widoczny dla społeczności
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Status Modes */}
            <div className="space-y-2.5 pt-1">
              {(Object.keys(STATUS_MODE_CONFIGS) as UserStatusMode[]).map((modeKey) => {
                const config = STATUS_MODE_CONFIGS[modeKey];
                const isSelected = currentMode === modeKey;
                const Icon = config.icon;

                return (
                  <button
                    key={modeKey}
                    type="button"
                    disabled={isSaving}
                    onClick={() => onSelectMode(modeKey)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between relative overflow-hidden active:scale-[0.98] ${
                      isSelected
                        ? `bg-gradient-to-r ${config.bgGrad} ${config.borderColor} shadow-[0_0_20px_rgba(168,85,247,0.2)]`
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <span className="text-2xl">{config.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${isSelected ? config.textColor : 'text-white'}`}>
                            {config.label}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white shadow-sm">
                              Aktualny
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                          {config.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 relative z-10">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-500 flex items-center justify-center text-white shadow-[0_0_10px_rgba(217,70,239,0.8)]">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/20" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 text-center text-[10.5px] text-slate-400">
              Zmiana statusu jest natychmiast widoczna w Odkrywaj, na radarze i w czatach.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
