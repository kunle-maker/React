import React, { useState, useEffect } from 'react';

const OptimizedImage = ({ src, alt, className, width, height }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageSrc(`https://ui-avatars.com/api/?name=${alt || 'User'}&background=random`);
      setIsLoaded(true);
      return;
    }

    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    
    img.onerror = () => {
      setError(true);
      setImageSrc(`https://ui-avatars.com/api/?name=${alt || 'User'}&background=random`);
      setIsLoaded(true);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, alt]);

  return (
    <>
      {!isLoaded && (
        <div 
          className={`${className} bg-gray-800 animate-pulse`}
          style={{ width, height }}
        />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          loading="lazy"
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