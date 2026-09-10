import React from 'react';
import { ExternalLink, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { NativeAd } from '../../types';
import { SponsoredContentLabel } from './SponsoredContentLabel';
import { trackAdClick } from '../../services/adTelemetry';

interface NativeAdCardProps {
  ad: NativeAd;
  format?: 'feed-card' | 'wide-card' | 'radar-card';
  className?: string;
  onOpenPrivacy?: () => void;
  onOpenPremium?: () => void;
}

export const NativeAdCard: React.FC<NativeAdCardProps> = ({
  ad,
  format = 'feed-card',
  className = '',
  onOpenPrivacy,
  onOpenPremium,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    trackAdClick(ad);
    if (ad.ctaUrl.startsWith('#') || ad.id === 'ad-aura-premium' || ad.id === 'ad-settings-premium') {
      e.preventDefault();
      if (onOpenPremium) {
        onOpenPremium();
      }
      return;
    }
  };

  // 1. Radar / Map Drawer Card format
  if (format === 'radar-card') {
    return (
      <a
        href={ad.ctaUrl}
        target={ad.ctaUrl.startsWith('#') ? '_self' : '_blank'}
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`aura-glass-card block rounded-2xl border border-fuchsia-500/20 bg-[#090b16]/90 backdrop-blur-xl p-3 shadow-lg hover:border-fuchsia-500/40 hover:bg-[#0c0e1e]/95 transition-all group ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10">
            <img
              src={ad.imageUrl}
              alt={ad.brandName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <SponsoredContentLabel onOpenPrivacy={onOpenPrivacy} onOpenPremium={onOpenPremium} />
              <span className="text-[10px] text-slate-400 truncate">{ad.advertiserDomain}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate group-hover:text-fuchsia-300 transition-colors">
              {ad.headline}
            </h4>
            <p className="text-[10.5px] text-slate-300 line-clamp-1 mt-0.5">
              {ad.description}
            </p>
          </div>

          <div className="p-1.5 rounded-xl bg-white/5 group-hover:bg-fuchsia-500/20 text-slate-300 group-hover:text-fuchsia-300 transition-all shrink-0">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </a>
    );
  }

  // 2. Wide format (Feed break / Moments gallery header / Settings)
  if (format === 'wide-card') {
    return (
      <div className={`aura-glass-card rounded-[24px] border border-fuchsia-500/25 bg-[#090b16]/85 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.7)] hover:border-fuchsia-500/40 transition-all group ${className}`}>
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          
          {/* Image */}
          <div className="relative w-full sm:w-48 h-36 sm:h-32 rounded-2xl overflow-hidden shrink-0 border border-white/10">
            <img
              src={ad.imageUrl}
              alt={ad.brandName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090b16]/80 via-transparent to-transparent sm:hidden" />
            <div className="absolute top-2 left-2 sm:hidden">
              <SponsoredContentLabel onOpenPrivacy={onOpenPrivacy} onOpenPremium={onOpenPremium} />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1.5 text-left">
            <div className="hidden sm:flex items-center justify-between gap-2">
              <SponsoredContentLabel onOpenPrivacy={onOpenPrivacy} onOpenPremium={onOpenPremium} />
              <span className="text-[10.5px] text-slate-400 font-medium">{ad.advertiserDomain}</span>
            </div>

            <div className="flex items-center gap-1.5 text-fuchsia-400 text-[10px] font-black uppercase tracking-wider">
              <span>{ad.brandName}</span>
              <span>•</span>
              <span className="text-slate-400 font-medium lowercase first-letter:uppercase">{ad.tagline}</span>
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-snug group-hover:text-fuchsia-200 transition-colors">
              {ad.headline}
            </h3>

            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {ad.description}
            </p>

            <div className="pt-2 flex items-center justify-between">
              <a
                href={ad.ctaUrl}
                target={ad.ctaUrl.startsWith('#') ? '_self' : '_blank'}
                rel="noopener noreferrer"
                onClick={handleClick}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-xs font-extrabold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                <span>{ad.ctaText}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {ad.category}
              </span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 3. Native Discover Feed Card format (matching standard profile tile)
  return (
    <div className={`aura-glass-card relative aspect-[3/4] rounded-[24px] overflow-hidden border border-fuchsia-500/30 bg-[#090b16] group cursor-pointer shadow-xl shadow-black/70 transition-all duration-300 ease-out hover:scale-[1.015] hover:border-fuchsia-400/60 hover:shadow-[0_16px_40px_rgba(217,70,239,0.25)] active:scale-[0.985] text-left flex flex-col justify-between ${className}`}>
      
      {/* Background Image with Dark Vignette */}
      <img
        src={ad.imageUrl}
        alt={ad.brandName}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06070e] via-[#06070e]/50 to-black/40" />

      {/* Top Bar: Sponsored Badge & Brand */}
      <div className="relative z-10 p-3 flex items-start justify-between gap-1.5">
        <SponsoredContentLabel onOpenPrivacy={onOpenPrivacy} onOpenPremium={onOpenPremium} />
        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9.5px] font-bold text-fuchsia-300">
          {ad.brandName}
        </span>
      </div>

      {/* Bottom Content Area */}
      <div className="relative z-10 p-3.5 space-y-1.5">
        <div className="flex items-center gap-1 text-[10px] text-fuchsia-300 font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-fuchsia-400 shrink-0" />
          <span className="truncate">{ad.tagline}</span>
        </div>

        <h3 className="text-sm font-black text-white leading-tight line-clamp-2 drop-shadow-md">
          {ad.headline}
        </h3>

        <p className="text-[11px] text-slate-300 line-clamp-2 leading-snug drop-shadow">
          {ad.description}
        </p>

        <div className="pt-2 flex items-center justify-between gap-2">
          <a
            href={ad.ctaUrl}
            target={ad.ctaUrl.startsWith('#') ? '_self' : '_blank'}
            rel="noopener noreferrer"
            onClick={handleClick}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-white/15 hover:bg-fuchsia-600/40 border border-white/20 hover:border-fuchsia-400 text-[11px] font-extrabold text-white transition-all backdrop-blur-md active:scale-95 shadow-md"
          >
            <span>{ad.ctaText}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-80" />
          </a>

          <span className="text-[9px] text-slate-400 truncate max-w-[70px]">
            {ad.advertiserDomain}
          </span>
        </div>
      </div>

    </div>
  );
};
