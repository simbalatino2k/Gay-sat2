import React from 'react';

interface AuraLogoProps {
  size?: number | string;
  showText?: boolean;
  className?: string;
  badge?: boolean;
}

export const AuraLogoIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Main "A" Ribbon Gradient */}
        <linearGradient id="auraLetterGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="35%" stopColor="#ec4899" />
          <stop offset="70%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Halo Ring Gradient */}
        <linearGradient id="auraHaloGrad" x1="40" y1="10" x2="160" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="40%" stopColor="#ec4899" />
          <stop offset="80%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Orbital Ellipse Gradient */}
        <linearGradient id="auraOrbitGrad" x1="10" y1="100" x2="190" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="30%" stopColor="#d946ef" />
          <stop offset="70%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>

        {/* Glow Filters */}
        <filter id="auraSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id="auraIntenseGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" result="blur1" />
          <feGaussianBlur stdDeviation="4" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background Soft Aura Glow */}
      <circle cx="100" cy="95" r="75" fill="url(#auraLetterGrad)" opacity="0.18" filter="blur(20px)" />

      {/* Top Background Halo Ring */}
      <circle
        cx="100"
        cy="70"
        r="52"
        stroke="url(#auraHaloGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
        filter="url(#auraSoftGlow)"
      />

      {/* Back Arc of Orbital Ellipse Ring */}
      <path
        d="M 22 105 C 22 88, 178 88, 178 105"
        stroke="url(#auraOrbitGrad)"
        strokeWidth="4"
        fill="none"
        opacity="0.45"
      />

      {/* Main "A" Shape with Integrated Heart Center */}
      <path
        d="M 100 24 
           C 114 24, 126 40, 142 85
           C 152 113, 160 134, 164 142
           C 166 146, 162 150, 154 150
           C 146 150, 138 144, 132 130
           C 126 116, 120 102, 114 96
           C 110 92, 106 94, 100 102
           C 98 105, 95 110, 93 113
           C 88 121, 84 126, 78 128
           C 72 130, 68 126, 68 120
           C 68 112, 74 102, 82 92
           C 87 86, 92 82, 100 75
           C 108 82, 113 86, 118 92
           C 126 102, 132 112, 132 120
           C 132 126, 128 130, 122 128
           C 116 126, 112 121, 107 113
           C 105 110, 102 105, 100 102
           C 94 94, 90 92, 86 96
           C 80 102, 74 116, 68 130
           C 62 144, 54 150, 46 150
           C 38 150, 34 146, 36 142
           C 40 134, 48 113, 58 85
           C 74 40, 86 24, 100 24 Z"
        fill="url(#auraLetterGrad)"
        filter="url(#auraSoftGlow)"
      />

      {/* Precision Rendered Outer Ribbon "A" and Heart Cutout */}
      <path
        d="M 100 28
           C 112 28, 124 48, 140 92
           L 155 135
           C 158 143, 150 146, 142 142
           L 128 112
           C 123 100, 118 92, 112 88
           C 108 85, 104 88, 100 94
           C 96 88, 92 85, 88 88
           C 82 92, 77 100, 72 112
           L 58 142
           C 50 146, 42 143, 45 135
           L 60 92
           C 76 48, 88 28, 100 28 Z"
        fill="url(#auraLetterGrad)"
      />

      {/* Inner Heart Emblem Cutout Overlay */}
      <path
        d="M 100 92
           C 105 84, 118 82, 125 92
           C 132 102, 128 118, 116 130
           C 108 138, 102 143, 100 145
           C 98 143, 92 138, 84 130
           C 72 118, 68 102, 75 92
           C 82 82, 95 84, 100 92 Z"
        fill="#0b0d12"
      />

      {/* Glowing Inner Heart Outline */}
      <path
        d="M 100 96
           C 104 88, 116 86, 122 95
           C 128 104, 124 117, 113 128
           C 106 135, 101 139, 100 141
           C 99 139, 94 135, 87 128
           C 76 117, 72 104, 78 95
           C 84 86, 96 88, 100 96 Z"
        stroke="url(#auraLetterGrad)"
        strokeWidth="3.5"
        fill="none"
        filter="url(#auraSoftGlow)"
      />

      {/* Front Arc of Orbital Ellipse Ring */}
      <path
        d="M 22 105 C 22 122, 178 122, 178 105"
        stroke="url(#auraOrbitGrad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#auraIntenseGlow)"
      />
    </svg>
  );
};

export const AuraLogo: React.FC<AuraLogoProps> = ({
  size = 140,
  showText = true,
  className = '',
  badge = true
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {/* App Badge Container */}
      <div
        className={`relative flex items-center justify-center rounded-[32px] transition-transform duration-300 ${
          badge
            ? 'p-4 bg-[#0a0c12] border border-white/10 shadow-2xl shadow-purple-950/60 backdrop-blur-2xl ring-1 ring-white/10'
            : ''
        }`}
        style={{ width: size, height: size }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-tr from-purple-600/20 via-pink-500/20 to-cyan-500/20 blur-xl opacity-70 pointer-events-none" />

        <AuraLogoIcon className="w-full h-full relative z-10" />
      </div>

      {showText && (
        <div className="mt-4 space-y-1 flex flex-col items-center">
          {/* Custom Styled "Aura" Brand Name */}
          <div className="flex items-center gap-1">
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-md">
              Aura
            </span>
          </div>

          {/* Subtitle Line — 18+ — */}
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-slate-400">
            <div className="h-[1.5px] w-6 bg-gradient-to-r from-transparent via-fuchsia-500 to-purple-500" />
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              18+
            </span>
            <div className="h-[1.5px] w-6 bg-gradient-to-r from-purple-500 via-cyan-500 to-transparent" />
          </div>
        </div>
      )}
    </div>
  );
};
