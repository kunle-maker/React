import React from 'react';

const PostSkeleton = () => {
  return (
    <div className="post-card animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center p-4">
        <div className="w-10 h-10 bg-gray-700 rounded-full mr-3"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-16"></div>
        </div>
      </div>
      
      {/* Media skeleton */}
      <div className="aspect-square bg-gray-800"></div>
      
      {/* Actions skeleton */}
      <div className="flex items-center justify-between p-4">
        <div className="flex gap-4">
          <div className="w-6 h-6 bg-gray-700 rounded-full"></div>
          <div className="w-6 h-6 bg-gray-700 rounded-full"></div>
          <div className="w-6 h-6 bg-gray-700 rounded-full"></div>
        </div>
        <div className="w-6 h-6 bg-gray-700 rounded-full"></div>
      </div>
    </div>
  );
};

export default PostSkeleton;