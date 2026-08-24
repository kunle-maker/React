import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import API from '../utils/api';

/**
 * Shows all quote posts for a given post.
 * Route: /post/:postId/quotes
 */
export default function PostQuotes({ currentUser, unreadCounts }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.getPostQuotes(postId)
      .then(data => setQuotes(Array.isArray(data) ? data : data?.quotes || []))
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false));
  }, [postId]);

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3 flex items-center gap-3">
          <button className="text-discord-muted hover:text-discord-text transition-colors" onClick={() => navigate(-1)}>
            <FiArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-discord-text">Quotes</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-20 text-discord-muted">
            <p className="text-3xl mb-3">💬</p>
            <p className="font-semibold">No quotes yet</p>
            <p className="text-sm mt-1">Be the first to quote this post</p>
          </div>
        ) : (
          <div>
            {quotes.map(q => (
              <PostCard key={q._id} post={q} currentUser={currentUser} />
            ))}
          </div>
        )}
        <div className="h-20 md:h-4" />
      </div>
    </Layout>
  );
}
