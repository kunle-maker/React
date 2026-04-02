import React from 'react';
import Layout from '../components/Layout';
import VideoFeed from '../components/VideoFeed';

export default function Reels({ currentUser, unreadCounts }) {
  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts} contentClass="overflow-hidden">
      <VideoFeed currentUser={currentUser} />
    </Layout>
  );
}
