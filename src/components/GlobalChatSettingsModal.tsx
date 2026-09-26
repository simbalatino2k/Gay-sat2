import React, { useState, useEffect } from 'react';
import {
  X, Settings, Shield, Cloud, CloudOff, Clock, Trash2, CheckCircle2, Lock, Smartphone
} from 'lucide-react';

interface GlobalChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authToken?: string | null;
}

export const GlobalChatSettingsModal: React.FC<GlobalChatSettingsModalProps> = ({
  isOpen,
  onClose,
  authToken
}) => {
  const [defaultLocalOnly, setDefaultLocalOnly] = useState<boolean>(() => {
    return localStorage.getItem('aura_pref_default_local_only') === 'true';
  });
  const [defaultTtl, setDefaultTtl] = useState<number | null>(() => {
    const saved = localStorage.getItem('aura_pref_default_ttl');
    return saved ? Number(saved) : null;
  });
  const [preventScreenshots, setPreventScreenshots] = useState<boolean>(() => {
    return localStorage.getItem('aura_pref_prevent_screenshots') !== 'false';
  });
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    localStorage.setItem('aura_pref_default_local_only', String(defaultLocalOnly));
  }, [defaultLocalOnly]);

  useEffect(() => {
    if (defaultTtl !== null) {
      localStorage.setItem('aura_pref_default_ttl', String(defaultTtl));
    } else {
      localStorage.removeItem('aura_pref_default_ttl');
    }
  }, [defaultTtl]);

  useEffect(() => {
    localStorage.setItem('aura_pref_prevent_screenshots', String(preventScreenshots));
  }, [preventScreenshots]);

  const handleClearChatCache = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('aura_local_chat_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2500);
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="global-chat-settings-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-[#141226] via-[#0e101f] to-[#090b14] border border-white/10 rounded-[28px] p-5 space-y-4 shadow-2xl relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">
                Prywatność Czatów
              </h3>
              <p className="text-[10px] text-slate-400">
                Ustawienia domyślne dla wszystkich rozmów
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition active:scale-95"
            title="Zamknij"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Domyślna kopia zapasowa */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {defaultLocalOnly ? (
                <CloudOff className="w-4 h-4 text-cyan-400" />
              ) : (
                <Cloud className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs font-bold text-white">Domyślna kopia zapasowa</span>
            </div>
            <button
              type="button"
              onClick={() => setDefaultLocalOnly(!defaultLocalOnly)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition-all active:scale-95 ${
                defaultLocalOnly
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {defaultLocalOnly ? 'TYLKO NA TELEFONIE' : 'CHMURA'}
            </button>
          </div>
          <p className="text-[10.5px] text-slate-400 leading-snug">
            {defaultLocalOnly
              ? 'Nowe rozmowy będą zapisywane wyłącznie lokalnie w pamięci Twojego urządzenia.'
              : 'Rozmowy będą synchronizowane z bezpieczną chmurą AURA Direct.'}
          </p>
        </div>

        {/* 2. Domyślny czas życia wiadomości (TTL) */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Znikające wiadomości (domyślnie)</span>
            </div>
            <span className="text-[10px] font-bold text-amber-300">
              {defaultTtl ? (defaultTtl >= 86400 ? `${defaultTtl / 86400}d` : `${defaultTtl / 3600}h`) : 'Stałe'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Stałe', val: null },
              { label: '1 godz.', val: 3600 },
              { label: '24 godz.', val: 86400 },
              { label: '7 dni', val: 604800 }
            ].map(opt => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setDefaultTtl(opt.val)}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition active:scale-95 flex items-center justify-center ${
                  defaultTtl === opt.val
                    ? 'border-amber-400/70 bg-amber-500/20 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                    : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Ochrona przed zrzutami ekranu */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-fuchsia-400" />
              <span className="text-xs font-bold text-white">Ochrona Skarbca & Zrzutów</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Blokuj pobieranie i zrzuty prywatnych zdjęć w czacie
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPreventScreenshots(!preventScreenshots)}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
              preventScreenshots ? 'bg-fuchsia-600' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                preventScreenshots ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 4. Czyszczenie pamięci podręcznej */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleClearChatCache}
            className="w-full py-2.5 px-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
          >
            {cacheCleared ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Wyczyszczono pamięć lokalną!</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Wyczyść lokalną pamięć podręczną czatów</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
