import React from 'react';

/**
 * AuraRadarScannerGraphic
 * High-precision vector illustration for radar / location exploration.
 */
export const AuraRadarScannerGraphic: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <radialGradient id="radarCenterGlow" cx="60" cy="60" r="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#d946ef" stopOpacity="0.35" />
        <stop offset="40%" stopColor="#a855f7" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="radarSweepGrad" x1="60" y1="60" x2="110" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
        <stop offset="70%" stopColor="#a855f7" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#d946ef" stopOpacity="0" />
      </linearGradient>
      <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Background Radar Disc */}
    <circle cx="60" cy="60" r="54" fill="#0b0d18" stroke="rgba(168, 85, 247, 0.25)" strokeWidth="1" />
    <circle cx="60" cy="60" r="48" fill="url(#radarCenterGlow)" />

    {/* Concentric Calibration Circles */}
    <circle cx="60" cy="60" r="38" stroke="rgba(217, 70, 239, 0.2)" strokeWidth="1" strokeDasharray="3 4" />
    <circle cx="60" cy="60" r="24" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="1" />
    <circle cx="60" cy="60" r="10" stroke="rgba(168, 85, 247, 0.35)" strokeWidth="1" />

    {/* Precision Crosshairs */}
    <line x1="60" y1="8" x2="60" y2="112" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
    <line x1="8" y1="60" x2="112" y2="60" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

    {/* Radar Blips */}
    <circle cx="78" cy="42" r="2.5" fill="#34d399" filter="url(#radarGlow)" />
    <circle cx="44" cy="74" r="2.5" fill="#38bdf8" filter="url(#radarGlow)" />
    <circle cx="82" cy="80" r="2" fill="#f43f5e" filter="url(#radarGlow)" />

    {/* Center Transmitter Core */}
    <circle cx="60" cy="60" r="3.5" fill="#ffffff" filter="url(#radarGlow)" />
    <circle cx="60" cy="60" r="6" stroke="#d946ef" strokeWidth="1.5" fill="none" opacity="0.8" />
  </svg>
);

/**
 * AuraMomentsHourglassGraphic
 * High-precision vector illustration for 24-Hour ephemeral stories.
 */
export const AuraMomentsHourglassGraphic: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="momentGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="50%" stopColor="#d946ef" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <filter id="momentGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Back Ambient Glow Disc */}
    <circle cx="60" cy="60" r="46" fill="url(#momentGrad)" opacity="0.12" filter="blur(10px)" />
    <circle cx="60" cy="60" r="48" stroke="rgba(217, 70, 239, 0.2)" strokeWidth="1" fill="#0c0e1a" />

    {/* Dynamic Orbit Ring */}
    <circle cx="60" cy="60" r="36" stroke="rgba(244, 63, 94, 0.25)" strokeWidth="1.5" strokeDasharray="6 8" />

    {/* 24-Hour Ephemeral Prism Spark */}
    <path
      d="M60 26L68 52L94 60L68 68L60 94L52 68L26 60L52 52Z"
      fill="url(#momentGrad)"
      filter="url(#momentGlow)"
    />

    {/* Center Radiant Core */}
    <circle cx="60" cy="60" r="4" fill="#ffffff" />
  </svg>
);

/**
 * AuraChatOrbGraphic
 * High-precision vector illustration for conversations and direct messaging.
 */
export const AuraChatOrbGraphic: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="chatOrbGrad" x1="15" y1="20" x2="105" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="50%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
      <filter id="chatOrbGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Base Atmospheric Glow */}
    <circle cx="60" cy="60" r="48" fill="#0b0d18" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
    <circle cx="60" cy="60" r="44" fill="url(#chatOrbGrad)" opacity="0.1" />

    {/* Primary Speech Bubble Shape */}
    <path
      d="M38 34C31.3726 34 26 39.3726 26 46V66C26 72.6274 31.3726 78 38 78H46V87L57 78H74C80.6274 78 86 72.6274 86 66V46C86 39.3726 80.6274 34 74 34H38Z"
      stroke="url(#chatOrbGrad)"
      strokeWidth="2"
      fill="rgba(168, 85, 247, 0.12)"
      filter="url(#chatOrbGlow)"
    />

    {/* Message Cadence Dots */}
    <circle cx="46" cy="56" r="3" fill="#a855f7" />
    <circle cx="56" cy="56" r="3" fill="#ec4899" />
    <circle cx="66" cy="56" r="3" fill="#06b6d4" />

    {/* Floating Secondary Dialogue Sparkle */}
    <path
      d="M84 28L86 35L93 37L86 39L84 46L82 39L75 37L82 35Z"
      fill="#ffffff"
      opacity="0.9"
    />
  </svg>
);
