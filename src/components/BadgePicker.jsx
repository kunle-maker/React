import React, { useState } from 'react';
import { FiX, FiCheck, FiSearch } from 'react-icons/fi';
import { BADGES, BADGE_CATEGORIES, getBadgeById } from '../data/badges';

function BadgeEmoji({ badge, size = 'md', active = false }) {
  const sizes = { sm: '1.5rem', md: '2rem', lg: '2.8rem' };
  return (
    <span
      className={`badge-anim-${badge.animation} inline-block select-none`}
      style={{ fontSize: sizes[size], lineHeight: 1 }}
      title={badge.label}
    >
      {badge.emoji}
    </span>
  );
}

export { BadgeEmoji };

export default function BadgePicker({ currentBadgeId, onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(currentBadgeId || null);

  const filtered = BADGES.filter(b => {
    const matchCat = activeCategory === 'all' || b.category === activeCategory;
    const matchSearch = !search || b.label.toLowerCase().includes(search.toLowerCase()) || b.emoji.includes(search);
    return matchCat && matchSearch;
  });

  const handleSelect = (badge) => {
    setSelected(badge.id);
  };

  const handleConfirm = () => {
    onSelect(selected);
  };

  const handleRemove = () => {
    setSelected(null);
    onSelect(null);
  };

  const currentBadge = selected ? getBadgeById(selected) : null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4">
      <div className="bg-[#111318] border border-white/8 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="font-black text-discord-text text-lg">Choose Your Badge</h2>
            <p className="text-discord-muted text-xs mt-0.5">Exclusive for Supa & Verified users</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Current selection preview */}
        {currentBadge && (
          <div className="mx-5 mb-3 bg-discord-brand/10 border border-discord-brand/25 rounded-xl p-3 flex items-center gap-3 flex-shrink-0">
            <BadgeEmoji badge={currentBadge} size="lg" />
            <div className="flex-1">
              <p className="text-discord-text font-bold text-sm">{currentBadge.label}</p>
              <p className="text-discord-muted text-xs">Active badge</p>
            </div>
            <button onClick={handleRemove} className="text-discord-muted hover:text-discord-red text-xs font-semibold transition-colors">Remove</button>
          </div>
        )}

        {/* Search */}
        <div className="px-5 mb-3 flex-shrink-0">
          <div className="relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
            <input
              className="discord-input w-full pl-8 py-2 text-sm"
              placeholder="Search badges..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-5 mb-3 flex-shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-discord-brand text-white shadow-md shadow-discord-brand/30'
                  : 'bg-white/5 text-discord-muted hover:text-discord-text hover:bg-white/8'
              }`}
            >
              🎨 All
            </button>
            {BADGE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-discord-brand text-white shadow-md shadow-discord-brand/30'
                    : 'bg-white/5 text-discord-muted hover:text-discord-text hover:bg-white/8'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Badge Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-discord-muted text-sm">No badges found</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {filtered.map(badge => {
                const isSelected = selected === badge.id;
                return (
                  <button
                    key={badge.id}
                    onClick={() => handleSelect(badge)}
                    title={badge.label}
                    className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-discord-brand/20 border-2 border-discord-brand shadow-md shadow-discord-brand/20'
                        : 'bg-white/3 border-2 border-transparent hover:bg-white/6 hover:border-white/10'
                    }`}
                  >
                    <BadgeEmoji badge={badge} size="md" />
                    <span className="text-[9px] text-discord-muted leading-tight text-center line-clamp-1">{badge.label}</span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-discord-brand rounded-full flex items-center justify-center">
                        <FiCheck size={9} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/6 flex gap-3 flex-shrink-0 bg-[#0d0f14]">
          <button onClick={onClose} className="discord-btn-ghost flex-1 py-3 rounded-xl font-semibold text-sm">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="discord-btn flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <FiCheck size={14} /> Apply Badge
          </button>
        </div>
      </div>
    </div>
  );
}
