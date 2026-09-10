import React, { useState } from 'react';
import { ShieldCheck, Lock, Sparkles, X, Check, HelpCircle } from 'lucide-react';
import { getAdConsent, saveAdConsent } from '../../config/adsConfig';
import { AdConsentState } from '../../types';

interface AdConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPremium?: () => void;
}

export const AdConsentModal: React.FC<AdConsentModalProps> = ({
  isOpen,
  onClose,
  onOpenPremium,
}) => {
  const [consent, setConsent] = useState<AdConsentState>(() => getAdConsent());
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleTogglePersonalized = (enabled: boolean) => {
    const updated = saveAdConsent({ allowPersonalizedAds: enabled });
    setConsent(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleToggleAnalytics = (enabled: boolean) => {
    const updated = saveAdConsent({ allowAnalytics: enabled });
    setConsent(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[28px] border border-white/15 bg-[#090b16]/95 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-left space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Preferencje Reklam i Prywatności</h3>
              <p className="text-[10.5px] text-slate-400">RODO (GDPR) & Dyrektywa ePrivacy UE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Box */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 text-[11px] text-slate-300 leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gwarancja Pełnej Poufności AURA</span>
          </div>
          <p>
            AURA nigdy nie profiluje ani nie sprzedaje Twoich prywatnych czatów, zdjęć ani wrażliwych cech tożsamości. Domyślnie serwujemy wyłącznie reklamy kontekstowe.
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-1">
          {/* Personalization Toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-white block">Personalizacja reklam</span>
              <span className="text-[10.5px] text-slate-400 leading-tight block">
                Pozwala partnerom dostosować tematykę ofert (np. lokalne wydarzenia, wellness). Możesz wycofać zgodę w każdej chwili.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePersonalized(!consent.allowPersonalizedAds)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                consent.allowPersonalizedAds ? 'bg-fuchsia-600' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  consent.allowPersonalizedAds ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Privacy-Safe Analytics Toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-white block">Anonimowe zliczanie wyświetleń</span>
              <span className="text-[10.5px] text-slate-400 leading-tight block">
                Zliczanie statystyk bez identyfikatorów osobowych na potrzeby rozliczeń z partnerami.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleAnalytics(!consent.allowAnalytics)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                consent.allowAnalytics ? 'bg-fuchsia-600' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  consent.allowAnalytics ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 py-1 animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Zaktualizowano preferencje zgód RODO/ePrivacy</span>
          </div>
        )}

        {/* Premium Upgrade Banner */}
        {onOpenPremium && (
          <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-r from-purple-950/40 via-fuchsia-950/40 to-black/60 p-3 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                AURA Premium = 0 reklam
              </span>
              <span className="text-[10.5px] text-slate-300 block">
                Całkowicie usuń wszystkie treści sponsorowane.
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenPremium();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-xs font-black text-white shrink-0 hover:brightness-110 active:scale-95 transition-all shadow"
            >
              Sprawdź
            </button>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors"
        >
          Gotowe
        </button>
      </div>
    </div>
  );
};
