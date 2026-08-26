import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiSearch, FiX, FiZap } from 'react-icons/fi';
import EMOJI_DATA from '../data/emojis';
import API from '../utils/api';

function twemojiUrl(emoji) {
  const cps = [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => parseInt(cp, 16) !== 0xfe0f);
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${cps.join('-')}.png`;
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

function StickerTab({ onSelectSticker, currentUser }) {
  const [packs, setPacks] = useState([]);
  const [activePack, setActivePack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.getStickerPacks().then(data => {
      const list = Array.isArray(data) ? data : data?.packs || [];
      setPacks(list);
      if (list.length) setActivePack(list[0]);
    }).catch(() => setPacks([])).finally(() => setLoading(false));
  }, []);

  const stickers = activePack?.stickers || [];

  if (loading) return (
    <div className="flex justify-center items-center h-full">
      <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (packs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full text-discord-muted gap-2 p-4">
      <span className="text-3xl">🎭</span>
      <p className="text-sm text-center">No sticker packs available yet</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sticker grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {activePack?.isSupa && !currentUser?.isSupa ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
            <span className="text-3xl">✦</span>
            <p className="text-discord-text font-bold text-sm text-center">Supa Exclusive Pack</p>
            <p className="text-discord-muted text-xs text-center">Upgrade to Supa to use these stickers</p>
          </div>
        ) : (
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {stickers.map((sticker, i) => (
              <button
                key={sticker._id || i}
                onClick={() => onSelectSticker({ url: sticker.url, id: sticker._id })}
                className="aspect-square rounded-xl p-1 hover:bg-discord-hover transition-colors active:scale-90 flex items-center justify-center"
              >
                <img
                  src={sticker.url}
                  alt={sticker.name || 'sticker'}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pack tabs */}
      <div className="flex items-center border-t border-discord-hover overflow-x-auto scrollbar-none px-1 py-1 flex-shrink-0 gap-0.5">
        {packs.map(pack => {
          const thumb = pack.stickers?.[0]?.url;
          const isActive = activePack?._id === pack._id;
          return (
            <button
              key={pack._id}
              onClick={() => setActivePack(pack)}
              title={pack.name}
              className={`relative flex-shrink-0 w-9 h-8 flex items-center justify-center rounded-lg transition-colors ${
                isActive ? 'bg-discord-brand/20' : 'hover:bg-discord-hover'
              }`}
            >
              {thumb ? (
                <img src={thumb} alt={pack.name} className="w-6 h-6 object-contain" />
              ) : (
                <span className="text-sm">🎭</span>
              )}
              {/* Supa badge */}
              {pack.isSupa && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] text-yellow-400 font-black leading-none">✦</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function EmojiStickerPicker({ onSelectEmoji, onSelectSticker, onClose, anchor = 'top', initialTab = 'emoji', currentUser }) {
  const [tab, setTab] = useState(initialTab);
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
      {/* Tab switcher */}
      <div className="flex border-b border-discord-hover flex-shrink-0">
        <button
          onClick={() => setTab('emoji')}
          className={`flex-1 py-2 text-xs font-bold transition-colors ${tab === 'emoji' ? 'text-discord-brand border-b-2 border-discord-brand' : 'text-discord-muted hover:text-discord-text'}`}
        >
          😀 Emoji
        </button>
        <button
          onClick={() => setTab('stickers')}
          className={`flex-1 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1 ${tab === 'stickers' ? 'text-discord-brand border-b-2 border-discord-brand' : 'text-discord-muted hover:text-discord-text'}`}
        >
          🎭 Stickers
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'emoji'
          ? <EmojiTab onSelect={onSelectEmoji} onClose={onClose} />
          : <StickerTab onSelectSticker={onSelectSticker} currentUser={currentUser} />
        }
      </div>
    </div>
  );
}


function twemojiUrl(emoji) {
  const cps = [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => parseInt(cp, 16) !== 0xfe0f);
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${cps.join('-')}.png`;
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
