import React, { useState, useEffect, useRef } from 'react';
import { FiMusic, FiSearch, FiX, FiPlay, FiPause, FiCheck } from 'react-icons/fi';
import API from '../utils/api';

function formatDuration(secs) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

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
      const data = await API.searchMusic(query);
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (url) => {
    if (!url) return;
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
            results.map((song) => {
              const hasPreview = !!song.previewUrl;
              const isPlaying = playingUrl === song.previewUrl;
              const duration = formatDuration(song.duration);
              return (
                <div key={song.id} className="flex items-center gap-3 p-2 hover:bg-discord-hover rounded-xl transition-colors group">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    {song.artwork ? (
                      <img src={song.artwork} alt={song.title} className="w-full h-full object-cover rounded-lg shadow-md" />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-discord-hover flex items-center justify-center text-discord-muted">
                        <FiMusic size={20} />
                      </div>
                    )}
                    <button
                      onClick={() => togglePlay(song.previewUrl)}
                      disabled={!hasPreview}
                      className={`absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg transition-opacity text-white ${hasPreview ? 'opacity-0 group-hover:opacity-100 cursor-pointer' : 'opacity-0 cursor-not-allowed'}`}
                    >
                      {isPlaying ? <FiPause fill="white" /> : <FiPlay fill="white" />}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-discord-text truncate">{song.title}</p>
                    <p className="text-xs text-discord-muted truncate">
                      {song.artist}{duration ? <span className="ml-1 opacity-60">· {duration}</span> : null}
                    </p>
                    {!hasPreview && (
                      <p className="text-[10px] text-discord-muted/60 mt-0.5">No preview available</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onSelect({
                        url: song.previewUrl,
                        name: song.title,
                        artist: song.artist,
                        artwork: song.artwork
                      });
                    }}
                    className="p-2 bg-brand-primary/10 text-brand-primary rounded-full hover:bg-brand-primary hover:text-white transition-all active:scale-90"
                  >
                    <FiCheck size={18} />
                  </button>
                </div>
              );
            })
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
