import React from 'react';
import { ShieldCheck, Sparkles, X } from 'lucide-react';

interface AdConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPremium?: () => void;
}

/** Information only: there is no external ad partner to grant consent to yet. */
export const AdConsentModal: React.FC<AdConsentModalProps> = ({
  isOpen,
  onClose,
  onOpenPremium,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-[28px] border border-white/15 bg-[#090b16]/95 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-left space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-fuchsia-400" />
            <h3 className="text-sm font-extrabold text-white">Promocja AURA i prywatność</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Zamknij" className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Ta karta promuje własne członkostwo AURA Black. Nie jest płatną reklamą zewnętrzną. Obecnie AURA nie wyświetla w tym miejscu reklam partnerów i nie prosi o zgodę na personalizację reklam.
        </p>

        {onOpenPremium && (
          <button type="button" onClick={() => { onClose(); onOpenPremium(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-fuchsia-500">
            <Sparkles className="w-4 h-4" /> Zobacz AURA Black
          </button>
        )}
        <button type="button" onClick={onClose} className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors">
          Gotowe
        </button>
      </div>
    </div>
  );
};
