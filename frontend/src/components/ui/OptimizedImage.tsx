import React, { useState, useEffect } from 'react';
import { useLazyImage, getWebPFallback } from '../../utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  sizes?: string;
  srcSet?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  quality = 0.8,
  format,
  placeholder,
  onLoad,
  onError,
  fallbackSrc,
  sizes,
  srcSet,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');
  
  const { ref, isLoaded, isInView } = useLazyImage(src, {
    quality,
    format,
    lazy: loading === 'lazy',
  });
  
  // Handle image loading
  useEffect(() => {
    if (loading === 'eager' || (loading === 'lazy' && isInView)) {
      // const optimalFormat = format || getOptimalImageFormat();
      const optimizedSrc = fallbackSrc 
        ? getWebPFallback(src, fallbackSrc)
        : src;
      
      setCurrentSrc(optimizedSrc);
    }
  }, [src, fallbackSrc, format, loading, isInView]);
  
  // Handle load events
  const handleLoad = () => {
      setIsImageLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    setHasError(true);
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      onError?.();
    }
  };
  
  // Show placeholder while loading
  if (!isLoaded && !hasError && placeholder) {
    return (
      <div
        ref={ref}
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
  if (hasError && !fallbackSrc) {
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
    <img
      ref={ref}
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={`transition-opacity duration-300 ${
        isImageLoaded ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      loading={loading}
      sizes={sizes}
      srcSet={srcSet}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        width,
        height,
      }}
    />
  );
};

export default OptimizedImage;

