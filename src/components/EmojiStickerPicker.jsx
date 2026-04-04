import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import EMOJI_DATA from '../data/emojis';

function twemojiUrl(emoji) {
  const cps = [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => parseInt(cp, 16) !== 0xfe0f);
  return `https://twemoji.maxcdn.com/v/latest/svg/${cps.join('-')}.svg`;
}

function TwemojiImg({ emoji, size = 24 }) {
  return (
    <img
      src={twemojiUrl(emoji)}
      alt={emoji}
      width={size}
      height={size}
      draggable={false}
      className="select-none object-contain"
      loading="lazy"
      onError={e => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline'; }}
    />
  );
}

function EmojiTab({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [categoryIdx, setCategoryIdx] = useState(0);
  const searchRef = useRef();
  const gridRef = useRef();

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  const allEmojis = useMemo(() => EMOJI_DATA.flatMap(cat => cat.emojis), []);

  const displayEmojis = useMemo(() => {
    if (!search.trim()) return EMOJI_DATA[categoryIdx]?.emojis || [];
    const q = search.toLowerCase();
    return allEmojis.filter(em => em.n?.includes(q) || em.e?.includes(search));
  }, [search, categoryIdx, allEmojis]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-discord-hover flex-shrink-0">
        <div className="relative">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-discord-muted pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); if (gridRef.current) gridRef.current.scrollTop = 0; }}
            placeholder="Find the perfect emoji"
            className="w-full bg-discord-hover text-discord-text text-sm pl-7 pr-7 py-2 rounded-xl outline-none placeholder-discord-muted"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text">
              <FiX size={12} />
            </button>
          )}
        </div>
      </div>

      {!search && (
        <div className="px-2 pt-2 pb-0.5 flex-shrink-0">
          <p className="text-discord-muted text-[10px] font-bold uppercase tracking-wider">{EMOJI_DATA[categoryIdx]?.label}</p>
        </div>
      )}
      {search && displayEmojis.length > 0 && (
        <div className="px-2 pt-2 pb-0.5 flex-shrink-0">
          <p className="text-discord-muted text-[10px] font-bold uppercase tracking-wider">{displayEmojis.length} result{displayEmojis.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      <div ref={gridRef} className="flex-1 overflow-y-auto p-2">
        {displayEmojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-discord-muted text-sm gap-2">
            <TwemojiImg emoji="🔍" size={28} />
            <p>No emoji found</p>
          </div>
        ) : (
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
            {displayEmojis.map((em, i) => (
              <button
                key={em.e + i}
                title={em.n}
                onClick={() => onSelect(em.e)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-discord-hover transition-colors active:scale-90"
              >
                <TwemojiImg emoji={em.e} size={22} />
                <span style={{ display: 'none' }}>{em.e}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!search && (
        <div className="flex items-center border-t border-discord-hover overflow-x-auto scrollbar-none px-1 py-1 flex-shrink-0">
          {EMOJI_DATA.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => { setCategoryIdx(i); if (gridRef.current) gridRef.current.scrollTop = 0; }}
              title={cat.label}
              className={`flex-shrink-0 w-9 h-8 flex items-center justify-center rounded-lg transition-colors ${
                categoryIdx === i ? 'bg-discord-brand/20 text-discord-brand' : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'
              }`}
            >
              <TwemojiImg emoji={cat.icon} size={18} />
              <span style={{ display: 'none' }}>{cat.icon}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmojiStickerPicker({ onSelectEmoji, onSelectSticker, onClose, anchor = 'top', initialTab = 'emoji' }) {
  const pickerRef = useRef();

  useEffect(() => {
    if (anchor === 'keyboard') return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose, anchor]);

  const style = anchor === 'keyboard' 
    ? { width: '100%', height: '100%', position: 'relative' }
    : { width: 320, height: 360, top: 'calc(100% + 8px)', right: 0, position: 'absolute' };

  return (
    <div
      ref={pickerRef}
      className={`z-50 bg-discord-dark overflow-hidden select-none flex flex-col ${anchor !== 'keyboard' ? 'border border-discord-hover rounded-2xl shadow-2xl' : ''}`}
      style={style}
      onMouseDown={e => e.preventDefault()}
    >
      <div className="flex-1 min-h-0">
        <EmojiTab onSelect={onSelectEmoji} onClose={onClose} />
      </div>
    </div>
  );
}
