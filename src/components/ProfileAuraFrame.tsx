import React from 'react';

export interface ProfileAuraFrameProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  isOnline?: boolean;
  intensity?: 'subtle' | 'normal' | 'prominent';
  borderWidth?: number;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
  role?: string;
  'aria-label'?: string;
}

/**
 * ProfileAuraFrame
 * 
 * Premium visual frame with a subtle animated "AURA LED" perimeter light
 * and soft ambient breathing glow around avatars and profile photos.
 * 
 * - Seamless 4-second perimeter light cycle inspired by high-end LED edge lighting
 * - Dual-layer atmospheric bloom (sharp edge + soft breathing halo)
 * - Higher luminous bloom for online/live profiles, subtle elegance for offline
 * - Preserves photo sharpness with a 100% unobstructed inner container
 * - Automatically adapts to any border radius (circular, rounded-2xl, rounded-card)
 * - Strictly respects prefers-reduced-motion
 */
export const ProfileAuraFrame: React.FC<ProfileAuraFrameProps> = ({
  children,
  className = '',
  innerClassName = '',
  isOnline = false,
  intensity = 'normal',
  borderWidth = 1.5,
  onClick,
  style,
  role,
  'aria-label': ariaLabel,
}) => {
  const isInteractive = Boolean(onClick);

  // Gradient bloom tailored to online status and intensity
  const ambientGlowStyle: React.CSSProperties = {
    background: isOnline
      ? 'radial-gradient(ellipse at center, rgba(217, 70, 239, 0.42) 0%, rgba(168, 85, 247, 0.26) 45%, rgba(6, 182, 212, 0.12) 70%, transparent 80%)'
      : 'radial-gradient(ellipse at center, rgba(168, 85, 247, 0.22) 0%, rgba(217, 70, 239, 0.12) 50%, transparent 75%)',
    filter: intensity === 'subtle' ? 'blur(6px)' : intensity === 'prominent' ? 'blur(12px)' : 'blur(8px)',
  };

  // Traveling LED perimeter light sweep
  const ledConicGradient = isOnline
    ? 'conic-gradient(from 0deg, transparent 0deg, transparent 180deg, rgba(168, 85, 247, 0.2) 230deg, rgba(217, 70, 239, 0.65) 285deg, rgba(6, 182, 212, 0.95) 335deg, rgba(255, 255, 255, 0.98) 352deg, rgba(6, 182, 212, 0.8) 360deg)'
    : 'conic-gradient(from 0deg, transparent 0deg, transparent 220deg, rgba(148, 163, 184, 0.15) 270deg, rgba(168, 85, 247, 0.45) 320deg, rgba(217, 70, 239, 0.7) 350deg, rgba(255, 255, 255, 0.8) 356deg, transparent 360deg)';

  return (
    <div
      onClick={onClick}
      role={role || (isInteractive ? 'button' : undefined)}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
      style={style}
      className={`relative rounded-[inherit] ${className}`}
    >
      {/* 1. Atmospheric Ambient Energy Halo (breathes independently behind frame) */}
      <div
        className={`absolute -inset-1 rounded-[inherit] pointer-events-none transition-opacity duration-700 ${
          isOnline ? 'aura-breathe-online' : 'aura-breathe-offline'
        }`}
        style={{ ...ambientGlowStyle, zIndex: 0 }}
      />

      {/* 2. Precision LED Perimeter Track with rotating luminous light beam */}
      <div
        className="relative w-full h-full rounded-[inherit] overflow-hidden"
        style={{ padding: `${borderWidth}px`, zIndex: 1 }}
      >
        {/* Continuous Traveling LED Energy Beam */}
        <div
          className="absolute -inset-[100%] aura-led-spin pointer-events-none"
          style={{ background: ledConicGradient }}
        />

        {/* Static Luminous Edge Bed (ensures border has a delicate baseline glow) */}
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            border: `1px solid ${
              isOnline ? 'rgba(217, 70, 239, 0.28)' : 'rgba(255, 255, 255, 0.09)'
            }`,
          }}
        />

        {/* 3. Photo Container — Completely sharp, pristine and unobstructed */}
        <div
          className={`relative w-full h-full rounded-[inherit] overflow-hidden bg-[#0a0c14] ${innerClassName}`}
          style={{ zIndex: 2 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
