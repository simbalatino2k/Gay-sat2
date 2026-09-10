import React from 'react';

interface AdSkeletonProps {
  format?: 'feed-card' | 'wide-card' | 'radar-card';
  className?: string;
}

export const AdSkeleton: React.FC<AdSkeletonProps> = ({
  format = 'feed-card',
  className = '',
}) => {
  if (format === 'wide-card') {
    return (
      <div className={`w-full rounded-[24px] border border-white/[0.08] bg-[#0c0e18]/70 backdrop-blur-xl p-4 sm:p-5 animate-pulse flex flex-col sm:flex-row gap-4 items-center ${className}`}>
        <div className="w-full sm:w-48 h-32 rounded-2xl bg-white/[0.05]" />
        <div className="flex-1 space-y-2.5 w-full">
          <div className="w-24 h-4 rounded-full bg-white/[0.06]" />
          <div className="w-3/4 h-5 rounded-lg bg-white/[0.08]" />
          <div className="w-full h-3 rounded bg-white/[0.04]" />
          <div className="w-28 h-8 rounded-full bg-white/[0.06] mt-2" />
        </div>
      </div>
    );
  }

  if (format === 'radar-card') {
    return (
      <div className={`w-full rounded-2xl border border-white/[0.08] bg-[#0c0e18]/80 backdrop-blur-xl p-3 animate-pulse flex items-center gap-3 ${className}`}>
        <div className="w-14 h-14 rounded-xl bg-white/[0.05] shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="w-20 h-3 rounded-full bg-white/[0.06]" />
          <div className="w-32 h-4 rounded bg-white/[0.08]" />
          <div className="w-24 h-2.5 rounded bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  // Default feed-card
  return (
    <div className={`relative aspect-[3/4] rounded-[24px] overflow-hidden border border-white/[0.08] bg-[#0c0e18]/70 backdrop-blur-xl p-3 animate-pulse flex flex-col justify-between ${className}`}>
      <div className="flex justify-between items-start">
        <div className="w-20 h-4 rounded-full bg-white/[0.06]" />
        <div className="w-6 h-6 rounded-full bg-white/[0.05]" />
      </div>
      <div className="space-y-2">
        <div className="w-2/3 h-4 rounded bg-white/[0.08]" />
        <div className="w-full h-3 rounded bg-white/[0.04]" />
        <div className="w-1/2 h-7 rounded-full bg-white/[0.06] mt-1" />
      </div>
    </div>
  );
};
