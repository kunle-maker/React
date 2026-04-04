import React from 'react';
import VideoFeed from '../components/VideoFeed';

export default function Reels({ currentUser }) {
  return (
    <div className="h-screen bg-black">
      <VideoFeed currentUser={currentUser} />
    </div>
  );
}
