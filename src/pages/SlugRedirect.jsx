import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';

/**
 * Resolves a custom profile URL slug → redirects to /profile/:username
 * Route: /u/:slug
 */
export default function SlugRedirect() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    API.resolveSlug(slug)
      .then(data => {
        const username = data?.username || data?.user?.username;
        if (username) {
          navigate(`/profile/${username}`, { replace: true });
        } else {
          setError('User not found');
        }
      })
      .catch(() => setError('This link is not valid or has been removed.'));
  }, [slug]);

  if (error) return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <p className="text-4xl">🔗</p>
        <p className="text-discord-text font-bold">Link not found</p>
        <p className="text-discord-muted text-sm">{error}</p>
        <button className="discord-btn px-5 py-2 rounded-xl text-sm mt-2" onClick={() => navigate('/')}>
          Go to Feed
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
