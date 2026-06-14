import React from 'react';
import logoUrl from '../assets/plyss-logo.jpeg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** retained for call-site compatibility; the mark no longer pulses */
  animate?: boolean;
}

const sizeClasses = {
  sm: 'w-11 h-11',
  md: 'w-16 h-16',
  lg: 'w-28 h-28',
  xl: 'w-40 h-40',
};

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  return (
    <img
      src={logoUrl}
      alt="PLYSS — Plateau Yoruba Statistical Survey"
      width={160}
      height={160}
      // bg-plate + rounding turn the crest JPEG's white backing into a
      // deliberate mounted seal on any surface (forest bands, dark mode)
      className={`${sizeClasses[size]} object-contain select-none rounded-md bg-plate ${className}`}
      draggable={false}
    />
  );
};

export default Logo;
