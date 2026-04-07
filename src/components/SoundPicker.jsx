import React, { useState, useEffect, useRef } from 'react';
import { FiMusic, FiSearch, FiX, FiPlay, FiPause, FiCheck } from 'react-icons/fi';
import API from '../utils/api';

export default function SoundPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState(null);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query) {
        searchSounds();
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchSounds = async () => {
    setLoading(true);
    try {
      const data = await API.searchExternalSounds(query);
      setResults(data.results || data || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (url) => {
    if (playingUrl === url) {
      audioRef.current.pause();
      setPlayingUrl(null);
    } else {
      audioRef.current.src = url;
      audioRef.current.play();
      setPlayingUrl(url);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setPlayingUrl(null);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-discord-sidebar w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-slide-up">
        <div className="p-4 border-b border-discord-hover/50 flex items-center justify-between bg-discord-bg/50">
          <div className="flex items-center gap-2">
            <FiMusic className="text-brand-primary" />
            <h3 className="font-bold text-discord-text">Add Music</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-discord-hover rounded-full transition-colors text-discord-muted hover:text-discord-text">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
            <input
              autoFocus
              type="text"
              placeholder="Search for songs or artists..."
              className="discord-input w-full pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length > 0 ? (
            results.map((song, i) => (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-discord-hover rounded-xl transition-colors group">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img src={song.artworkUrl100} alt={song.trackName} className="w-full h-full object-cover rounded-lg shadow-md" />
                  <button
                    onClick={() => togglePlay(song.previewUrl)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  >
                    {playingUrl === song.previewUrl ? <FiPause fill="white" /> : <FiPlay fill="white" />}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-discord-text truncate">{song.trackName}</p>
                  <p className="text-xs text-discord-muted truncate">{song.artistName}</p>
                </div>
                <button
                  onClick={() => {
                    onSelect({
                      url: song.previewUrl,
                      name: song.trackName,
                      artist: song.artistName,
                      artwork: song.artworkUrl100
                    });
                  }}
                  className="p-2 bg-brand-primary/10 text-brand-primary rounded-full hover:bg-brand-primary hover:text-white transition-all active:scale-90"
                >
                  <FiCheck size={18} />
                </button>
              </div>
            ))
          ) : query ? (
            <div className="text-center py-12 text-discord-muted">
              <p className="text-sm">No songs found for "{query}"</p>
            </div>
          ) : (
            <div className="text-center py-12 text-discord-muted">
              <FiMusic size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Search to find music for your post</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
