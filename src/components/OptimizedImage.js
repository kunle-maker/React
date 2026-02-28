import React, { useState, useEffect } from 'react';

const OptimizedImage = ({ src, alt, className, width, height, priority = false }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Check if browser supports WebP
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  };

  const getOptimizedImageUrl = (url) => {
    if (!url) return url;
    
    // If it's a Cloudinary URL, add WebP and optimization parameters
    if (url.includes('cloudinary.com')) {
      const transformations = [];
      
      // Add width if specified
      if (width) {
        transformations.push(`w_${width}`);
      }
      
      // Add WebP if supported
      if (supportsWebP()) {
        transformations.push('f_webp');
      }
      
      transformations.push('q_auto');
      
      if (transformations.length > 0) {
        return url.replace('/upload/', `/upload/${transformations.join(',')}/`);
      }
    }
    
    // If it's a local image, we could add query params for CDN
    if (url.startsWith('/api/media/')) {
      const params = new URLSearchParams();
      if (width) params.append('w', width);
      if (supportsWebP()) params.append('format', 'webp');
      
      return `${url}?${params.toString()}`;
    }
    
    return url;
  };

  useEffect(() => {
    if (!src) {
      setImageSrc(`https://ui-avatars.com/api/?name=${alt || 'User'}&background=random`);
      setIsLoaded(true);
      return;
    }

    const optimizedUrl = getOptimizedImageUrl(src);
    
    if (priority) {
      // For priority images, load immediately
      const img = new Image();
      img.src = optimizedUrl;
      
      img.onload = () => {
        setImageSrc(optimizedUrl);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setError(true);
        setImageSrc(`https://ui-avatars.com/api/?name=${alt || 'User'}&background=random`);
        setIsLoaded(true);
      };
    } else {
      // For lazy images, use Intersection Observer
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = new Image();
              img.src = optimizedUrl;
              
              img.onload = () => {
                setImageSrc(optimizedUrl);
                setIsLoaded(true);
                observer.disconnect();
              };
              
              img.onerror = () => {
                setError(true);
                setImageSrc(`https://ui-avatars.com/api/?name=${alt || 'User'}&background=random`);
                setIsLoaded(true);
                observer.disconnect();
              };
            }
          });
        },
        {
          rootMargin: '50px',
          threshold: 0.1
        }
      );

      const element = document.querySelector(`[data-image-id="${alt}"]`);
      if (element) {
        observer.observe(element);
      }

      return () => observer.disconnect();
    }
  }, [src, alt, width, priority]);

  return (
    <>
      {!isLoaded && (
        <div 
          className={`${className} bg-gray-800 animate-pulse`}
          style={{ width, height }}
          data-image-id={alt}
        />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          loading={priority ? 'eager' : 'lazy'}
          width={width}
          height={height}
          onError={() => {
            if (!error) {
              setImageSrc(`https://ui-avatars.com/api/?name=${alt || 'User'}&background=random`);
              setError(true);
            }
          }}
        />
      )}
    </>
  );
};

export default OptimizedImage;