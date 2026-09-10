import React, { useState } from 'react';
import { Info, Sparkles, X, ShieldCheck } from 'lucide-react';

interface SponsoredContentLabelProps {
  className?: string;
  onOpenPrivacy?: () => void;
  onOpenPremium?: () => void;
}

export const SponsoredContentLabel: React.FC<SponsoredContentLabelProps> = ({
  className = '',
  onOpenPrivacy,
  onOpenPremium,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowInfo(!showInfo);
        }}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-extrabold uppercase tracking-wider text-slate-300 hover:text-white hover:border-fuchsia-500/40 hover:bg-black/80 transition-all shadow-sm"
        title="Informacje o treści sponsorowanej"
      >
        <span className="w-1 h-1 rounded-full bg-fuchsia-400" />
        <span>Sponsorowane</span>
        <Info className="w-2.5 h-2.5 text-slate-400" />
      </button>

      {showInfo && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-1.5 w-64 z-50 rounded-2xl bg-[#090b16]/95 backdrop-blur-2xl border border-white/15 p-3 text-left shadow-[0_12px_36px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
            <span className="flex items-center gap-1.5 text-[11px] font-black text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-fuchsia-400" />
              Treść sponsorowana AURA
            </span>
            <button
              onClick={() => setShowInfo(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <p className="text-[10px] text-slate-300 leading-relaxed">
            Dyskretne reklamy natywne wspierają działanie i bezpieczeństwo AURA 18+ bez inwazyjnych bannerów i bez śledzenia Twoich prywatnych rozmów.
          </p>

          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
            {onOpenPremium && (
              <button
                type="button"
                onClick={() => {
                  setShowInfo(false);
                  onOpenPremium();
                }}
                className="flex items-center gap-1 text-fuchsia-400 hover:text-fuchsia-300 font-bold transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Usuń reklamy
              </button>
            )}

            {onOpenPrivacy && (
              <button
                type="button"
                onClick={() => {
                  setShowInfo(false);
                  onOpenPrivacy();
                }}
                className="text-slate-400 hover:text-white underline transition-colors"
              >
                Prywatność
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
