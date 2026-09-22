import React from 'react';

interface BrandLogoProps {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

/**
 * Aurora Reader Master Logo — Variant 01: The Luminary Folio (Trang Sách Ánh Sáng)
 * High-end minimalist vector emblem combining open book spread and the Aurora guiding star.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-full h-full',
  style,
  color
}) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      style={{ color, ...style }}
    >
      {/* Symmetrical Open Book Wings */}
      <path 
        d="M 20 72 C 32 64, 43 66, 50 74 C 57 66, 68 64, 80 72 L 80 50 C 68 42, 57 44, 50 52 C 43 44, 32 42, 20 50 Z" 
        stroke="currentColor" 
        strokeWidth="3.2" 
        strokeLinejoin="round" 
      />
      {/* Center Spine Crease Line */}
      <line 
        x1="50" 
        y1="52" 
        x2="50" 
        y2="74" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
      />
      {/* The Rising Aurora 8-Point Star of Wisdom */}
      <path 
        d="M 50 14 Q 50 28, 64 28 Q 50 28, 50 42 Q 50 28, 36 28 Q 50 28, 50 14 Z" 
        fill="currentColor" 
      />
      {/* Central Core Luminary Point */}
      <circle cx="50" cy="28" r="2.2" fill="#ffffff" />
      {/* Ambient Satellite Sparks */}
      <circle cx="28" cy="22" r="1.5" fill="currentColor" opacity="0.55" />
      <circle cx="72" cy="22" r="1.5" fill="currentColor" opacity="0.55" />
    </svg>
  );
};
