import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';

/**
 * Resolves a custom profile URL slug → redirects to /profile/:username
 * Route: /u/:slug
 *
 * Also updates OG meta tags dynamically so JS-capable crawlers (e.g. Google)
 * can read the correct title/description/image for this user.
 */
function updateMetaTags({ title, description, image, url }) {
  document.title = title;
  const set = (sel, attr, val) => {
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement('meta');
      const parts = sel.match(/\[(\w+)="([^"]+)"\]/);
      if (parts) el.setAttribute(parts[1], parts[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  };
  set('meta[property="og:title"]',       'content', title);
  set('meta[property="og:description"]', 'content', description);
  set('meta[property="og:image"]',       'content', image);
  set('meta[property="og:url"]',         'content', url);
  set('meta[name="twitter:title"]',      'content', title);
  set('meta[name="twitter:description"]','content', description);
  set('meta[name="twitter:image"]',      'content', image);
  set('meta[name="description"]',        'content', description);
}

export default function SlugRedirect() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    API.resolveSlug(slug)
      .then(data => {
        const user = data?.user || data;
        const username = user?.username || data?.username;
        if (!username) { setError('User not found'); return; }

        // Update meta tags with real user data so JS-capable bots see them
        const displayName = user?.name || username;
        const avatar = user?.profilePicture
          ? API.getAvatarUrl(user.profilePicture, 256)
          : 'https://vesselx.qzz.io/icons/icon-512.png';
        const bio = user?.bio
          ? user.bio.slice(0, 120) + (user.bio.length > 120 ? '…' : '')
          : `Check out ${displayName}'s profile on VesselX`;
        const pageUrl = `${window.location.origin}/#/u/${slug}`;

        updateMetaTags({
          title: `${displayName} (@${username}) — VesselX`,
          description: bio,
          image: avatar,
          url: pageUrl,
        });

        navigate(`/profile/${username}`, { replace: true });
      })
      .catch(() => setError('This link is not valid or has been removed.'));
  }, [slug]);

  if (error) return (
    <div className="min-h-screen bg-discord-bg flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-discord-bg flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
      <p className="text-discord-muted text-sm">Loading profile…</p>
    </div>
  );
}
