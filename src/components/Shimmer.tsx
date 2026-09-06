import React from 'react';

export const Shimmer: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-md mx-auto">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="aura-skeleton aspect-[3/4] rounded-[24px] border border-white/[0.06] bg-[#0c0e18]/80 p-3 flex flex-col justify-between"
        >
          <div className="flex justify-between items-center">
            <div className="w-14 h-4 rounded-full bg-white/[0.06]" />
            <div className="w-10 h-3.5 rounded-full bg-white/[0.04]" />
          </div>
          <div className="space-y-2 pt-10">
            <div className="w-28 h-4 rounded-md bg-white/[0.08]" />
            <div className="flex justify-between items-center">
              <div className="w-16 h-3 rounded-md bg-white/[0.05]" />
              <div className="w-10 h-3 rounded-md bg-white/[0.05]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

