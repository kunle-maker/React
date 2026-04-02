import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';
import API from '../utils/api';

export default function JoinGroup() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (code) joinGroup();
  }, [code]);

  const joinGroup = async () => {
    setLoading(true);
    try {
      const data = await API.joinGroup(code);
      const group = data.group || data;
      navigate(`/groups/${group._id}`);
    } catch (err) {
      setError(err.message || 'Invalid or expired invite link');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="bg-discord-sidebar rounded-lg p-8 w-full max-w-sm text-center shadow-2xl">
        {loading ? (
          <>
            <div className="w-16 h-16 rounded-full bg-discord-brand flex items-center justify-center mx-auto mb-4">
              <FiUsers size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-discord-text mb-2">Joining Group...</h2>
            <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-discord-text mb-2">Unable to join</h2>
            <p className="text-discord-muted text-sm mb-6">{error}</p>
            <button className="discord-btn w-full py-2" onClick={() => navigate('/groups')}>Go to Groups</button>
          </>
        )}
      </div>
    </div>
  );
}
