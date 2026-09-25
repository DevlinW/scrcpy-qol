import React, { useState } from 'react';

interface AppIconProps {
  src?: string;
  fallbackName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  src,
  fallbackName,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate 1-2 character initials for monogram fallback
  const getInitials = (name: string) => {
    if (!name) return 'A';
    const words = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px] rounded-md',
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-11 h-11 text-sm rounded-xl',
    lg: 'w-14 h-14 text-base rounded-xl',
    xl: 'w-20 h-20 text-xl rounded-2xl',
  };

  const showImage = src && !hasError;

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center font-bold tracking-wider select-none overflow-hidden border border-zinc-800/80 bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-300 shadow-sm ${sizeStyles[size]} ${className}`}
    >
      {showImage && (
        <img
          src={src}
          alt={fallbackName}
          loading="lazy"
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {(!showImage || !isLoaded) && (
        <span className="font-mono text-zinc-300">
          {getInitials(fallbackName)}
        </span>
      )}
    </div>
  );
};
