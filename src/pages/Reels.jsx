import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VideoFeed from '../components/VideoFeed';

export default function Reels({ currentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { initialPosts, startIndex } = location.state || {};

  return (
    <div className="h-screen bg-black">
      <VideoFeed 
        currentUser={currentUser} 
        initialPosts={initialPosts}
        startIndex={startIndex}
        onClose={() => navigate(-1)}
      />
    </div>
  );
}
