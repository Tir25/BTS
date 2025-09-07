import React, { useState } from 'react';
import { useProgressiveImage } from '../../utils/imageOptimization';

interface ProgressiveImageProps {
  lowQualitySrc: string;
  highQualitySrc: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: string;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  lowQualitySrc,
  highQualitySrc,
  alt,
  width,
  height,
  className = '',
  onLoad,
  onError,
  placeholder,
}) => {
  const { src, isLoaded } = useProgressiveImage(lowQualitySrc, highQualitySrc);
  const [hasError, setHasError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  const handleLoad = () => {
    setIsImageLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    setHasError(true);
    onError?.();
  };
  
  // Show placeholder while loading
  if (!isImageLoaded && placeholder) {
    return (
      <div
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
        aria-label={alt}
      >
        <img
          src={placeholder}
          alt=""
          className="w-full h-full object-cover opacity-50"
          style={{ width, height }}
        />
      </div>
    );
  }
  
  // Show error state
  if (hasError) {
    return (
      <div
        className={`bg-gray-300 flex items-center justify-center ${className}`}
        style={{ width, height }}
        aria-label={`Failed to load image: ${alt}`}
      >
        <div className="text-gray-500 text-center p-4">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">Image unavailable</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Low quality image (always visible) */}
      <img
        src={lowQualitySrc}
        alt={alt}
        width={width}
        height={height}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ filter: 'blur(5px)' }}
      />
      
      {/* High quality image (fades in when loaded) */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;

