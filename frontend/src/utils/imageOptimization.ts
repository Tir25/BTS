// Image optimization utilities for better performance

import React from 'react';

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: string;
}

export interface OptimizedImageProps {
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
}

// Image format detection and optimization
export const getOptimalImageFormat = (): string => {
  if (typeof window === 'undefined') return 'webp';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return 'webp';
  
  // Check for AVIF support (best compression)
  if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
    return 'avif';
  }
  
  // Check for WebP support (good compression)
  if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
    return 'webp';
  }
  
  // Fallback to JPEG
  return 'jpeg';
};

// Generate responsive image sources
export const generateResponsiveSources = (
  baseSrc: string,
  sizes: number[] = [320, 640, 1024, 1920],
  format?: string
): string => {
  const optimalFormat = format || getOptimalImageFormat();
  const baseUrl = baseSrc.replace(/\.[^/.]+$/, '');
  
  return sizes.map(size => `${baseUrl}-${size}w.${optimalFormat} ${size}w`).join(', ') as string;
};

// Lazy loading with intersection observer
export const useLazyImage = (src: string, _options: ImageOptimizationOptions = {}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const [error, setError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  React.useEffect(() => {
    if (isInView && !isLoaded && !error) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setError(true);
      img.src = src;
    }
  }, [isInView, isLoaded, error, src]);
  
  return {
    ref: imgRef,
    isLoaded,
    isInView,
    error,
  };
};

// Image compression utility
export const compressImage = (
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    img.onload = () => {
      const { quality = 0.8, format = 'jpeg', width, height } = options;
      
      // Calculate dimensions
      let targetWidth = width || img.width;
      let targetHeight = height || img.height;
      
      // Maintain aspect ratio if only one dimension is specified
      if (width && !height) {
        targetHeight = (img.height * width) / img.width;
      } else if (height && !width) {
        targetWidth = (img.width * height) / img.height;
      }
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      const mimeType = `image/${format}`;
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Image compression failed'));
          }
        },
        mimeType,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
};

// Progressive image loading
export const useProgressiveImage = (lowQualitySrc: string, highQualitySrc: string) => {
  const [src, setSrc] = React.useState(lowQualitySrc);
  const [isLoaded, setIsLoaded] = React.useState(false);
  
  React.useEffect(() => {
    setSrc(lowQualitySrc);
    setIsLoaded(false);
    
    const img = new Image();
    img.onload = () => {
      setSrc(highQualitySrc);
      setIsLoaded(true);
    };
    img.src = highQualitySrc;
  }, [lowQualitySrc, highQualitySrc]);
  
  return { src, isLoaded };
};

// Image preloading utility
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Batch image preloading
export const preloadImages = (srcs: string[]): Promise<void[]> => {
  return Promise.all(srcs.map(preloadImage));
};

// Image optimization for different screen densities
export const getOptimizedImageSrc = (
  baseSrc: string,
  pixelRatio: number = window.devicePixelRatio || 1,
  format?: string
): string => {
  const optimalFormat = format || getOptimalImageFormat();
  const baseUrl = baseSrc.replace(/\.[^/.]+$/, '');
  
  // Use higher resolution for high-DPI displays
  if (pixelRatio > 1) {
    return `${baseUrl}-2x.${optimalFormat}`;
  }
  
  return `${baseUrl}.${optimalFormat}`;
};

// WebP fallback utility
export const getWebPFallback = (webpSrc: string, fallbackSrc: string): string => {
  const supportsWebP = getOptimalImageFormat() === 'webp';
  return supportsWebP ? webpSrc : fallbackSrc;
};

// Note: React is already imported at the top

