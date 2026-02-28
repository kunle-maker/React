import React from 'react';

const PageLoader = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="text-4xl font-bold text-white tracking-tight">VesselX</span>
          <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.7)] animate-pulse"></div>
        </div>
        <div className="loading-spinner mx-auto"></div>
        <p className="text-gray-400 mt-4 text-sm">Loading your page...</p>
      </div>
    </div>
  );
};

export default PageLoader;