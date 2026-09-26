import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  TranslationKey,
  LanguageInfo
} from '../lib/i18n';
import { Globe, Check, X, Sparkles, ChevronDown } from 'lucide-react';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey | (string & {}), fallback?: string) => string;
  currentLanguageInfo: LanguageInfo;
  languages: LanguageInfo[];
  isRtl: boolean;
  isLanguageModalOpen: boolean;
  openLanguageModal: () => void;
  closeLanguageModal: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'aura_app_language';

// Helper to resolve device language from navigator.language
export function getDeviceLanguage(): SupportedLanguage {
  try {
    const raw = typeof navigator !== 'undefined'
      ? (navigator.language || (navigator.languages && navigator.languages[0]) || '')
      : '';
    if (raw) {
      const normalized = raw.split('-')[0].toLowerCase();
      const matched = SUPPORTED_LANGUAGES.find(l => l.code === normalized);
      if (matched) return matched.code;
    }
  } catch {}
  return 'pl';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
      if (saved && TRANSLATIONS[saved]) {
        return saved;
      }
      return getDeviceLanguage();
    } catch {}
    return 'pl';
  });

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const currentLanguageInfo =
    SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES.find(l => l.code === 'pl') || SUPPORTED_LANGUAGES[0];
  const isRtl = currentLanguageInfo.direction === 'rtl';

  const setLanguage = (newLang: SupportedLanguage) => {
    if (TRANSLATIONS[newLang]) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
      } catch {}
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    } catch {}
  }, [language, isRtl]);

  const t = (key: TranslationKey | (string & {}), fallback?: string): string => {
    const langDict = (TRANSLATIONS[language] || TRANSLATIONS.pl) as Record<string, string>;
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to Polish
    const plDict = TRANSLATIONS.pl as Record<string, string>;
    if (plDict && plDict[key]) {
      return plDict[key];
    }
    // Secondary fallback to English
    const enDict = TRANSLATIONS.en as Record<string, string>;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  const openLanguageModal = () => setIsLanguageModalOpen(true);
  const closeLanguageModal = () => setIsLanguageModalOpen(false);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        currentLanguageInfo,
        languages: SUPPORTED_LANGUAGES,
        isRtl,
        isLanguageModalOpen,
        openLanguageModal,
        closeLanguageModal,
      }}
    >
      {children}
      {isLanguageModalOpen && (
        <LanguageSelectorModal
          isOpen={isLanguageModalOpen}
          onClose={closeLanguageModal}
        />
      )}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

/**
 * High-craft, neon-accented Language Selector Modal
 */
export const LanguageSelectorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t, languages } = useTranslation();
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = languages.filter(
    l =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div
        className="w-full max-w-md bg-[#0a0c16] border border-cyan-500/30 rounded-[32px] p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[85vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Neon Glow Header */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-400" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <span>{t('settings_select_language', 'Select Language')}</span>
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              </h2>
              <p className="text-[11px] text-cyan-300/80 font-medium">15 global languages supported</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Search */}
        <div className="py-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search language / szukaj..."
            className="w-full bg-[#121526] border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
          />
        </div>

        {/* Language Grid */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar py-1">
          {filtered.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all duration-200 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-950/60 via-fuchsia-950/40 to-transparent border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.25)] text-white scale-[1.01]'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/20 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl filter drop-shadow">{lang.flag}</span>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{lang.nativeName}</span>
                      {isSelected && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">{lang.name} ({lang.code.toUpperCase()})</div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-7 h-7 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.8)]">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center opacity-40 group-hover:opacity-100" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            {t('common_close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Small, collapsed language selector that shows ONLY the selected language until clicked.
 * Upon clicking, it toggles the dropdown list of available languages.
 */
export const CollapsedLanguageSelector: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { language, setLanguage, currentLanguageInfo, languages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        id="btn-collapsed-language-selector"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#080c16] border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] active:scale-95"
        title="Wybierz język"
      >
        <span className="text-base leading-none">{currentLanguageInfo.flag}</span>
        <span className="font-bold text-white">{currentLanguageInfo.nativeName}</span>
        <span className="text-[10px] text-cyan-300 font-extrabold uppercase bg-cyan-500/20 px-1.5 py-0.5 rounded-md">
          {currentLanguageInfo.code}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Language list shown ONLY after clicking */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 z-50 w-64 max-h-72 overflow-y-auto rounded-2xl bg-[#0a0d18] border border-cyan-500/40 shadow-2xl p-2 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 custom-scrollbar">
            <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
              Wybierz język / Select language
            </div>
            {languages.map((l) => {
              const isSelected = language === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLanguage(l.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/80 to-purple-950/60 border border-cyan-400/50 text-white font-bold'
                      : 'hover:bg-white/[0.06] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{l.flag}</span>
                    <div>
                      <div className="text-xs leading-tight">{l.nativeName}</div>
                      <div className="text-[10px] text-slate-400 leading-none">{l.name}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-300 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Neon Pill Trigger Button for Language Selector
 */
export const LanguagePickerButton: React.FC<{
  className?: string;
  showName?: boolean;
}> = ({ className = '', showName = true }) => {
  const { currentLanguageInfo, openLanguageModal } = useTranslation();

  return (
    <button
      onClick={openLanguageModal}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white transition-all shadow-[0_0_8px_rgba(6,182,212,0.15)] active:scale-95 text-[10px] font-bold ${className}`}
      title="Change Language / Zmień język"
    >
      <span className="text-xs leading-none">{currentLanguageInfo.flag}</span>
      {showName && (
        <span className="uppercase text-[9px] tracking-wider font-extrabold text-cyan-200 leading-none">
          {currentLanguageInfo.code}
        </span>
      )}
      <Globe className="w-2.5 h-2.5 text-cyan-400 stroke-[2.2] animate-pulse" />
    </button>
  );
};
