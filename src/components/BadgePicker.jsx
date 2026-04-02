import React, { useState } from 'react';
import { FiX, FiCheck, FiSearch, FiLock } from 'react-icons/fi';
import { BADGES, BADGE_PACKS, getBadgeById } from '../data/badges';
import { BADGE_SVG_MAP } from './BadgeSVGs';

function BadgeIcon({ badge, px = 28, locked = false }) {
  const SvgComp = BADGE_SVG_MAP[badge.svgId];
  if (!SvgComp) return null;
  return (
    <span
      className={`badge-anim-${badge.animation} inline-block select-none ${locked ? 'opacity-35 grayscale' : ''}`}
      style={{ display: 'inline-block', filter: locked ? 'none' : `drop-shadow(0 0 5px ${badge.glow})` }}
      title={badge.label}
    >
      <SvgComp color={badge.color} size={px} />
    </span>
  );
}

export { BadgeIcon as BadgeEmoji };

export default function BadgePicker({ currentBadgeId, onSelect, onClose, isSupa = false }) {
  const [activePack, setActivePack] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(currentBadgeId || null);

  const filtered = BADGES.filter(b => {
    const matchPack = activePack === 'all' || b.category === activePack;
    const matchSearch = !search || b.label.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search.toLowerCase());
    return matchPack && matchSearch;
  });

  const handleSelect = (badge) => {
    if (badge.supa && !isSupa) return;
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

  const freePacks = BADGE_PACKS.filter(p => !p.supa);
  const supaPacks = BADGE_PACKS.filter(p => p.supa);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4">
      <div className="bg-[#111318] border border-white/8 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="font-black text-discord-text text-lg">Choose Your Badge</h2>
            <p className="text-discord-muted text-xs mt-0.5">
              {isSupa ? 'All packs unlocked — you\'re Supa ✨' : 'Supa users unlock exclusive packs'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {currentBadge && (
          <div className="mx-5 mb-3 bg-discord-brand/10 border border-discord-brand/25 rounded-xl p-3 flex items-center gap-3 flex-shrink-0">
            <BadgeIcon badge={currentBadge} px={36} />
            <div className="flex-1">
              <p className="text-discord-text font-bold text-sm">{currentBadge.label}</p>
              <p className="text-discord-muted text-xs">Active badge</p>
            </div>
            <button onClick={handleRemove} className="text-discord-muted hover:text-discord-red text-xs font-semibold transition-colors">Remove</button>
          </div>
        )}

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

        <div className="px-5 mb-3 flex-shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActivePack('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                activePack === 'all'
                  ? 'bg-discord-brand text-white shadow-md shadow-discord-brand/30'
                  : 'bg-white/5 text-discord-muted hover:text-discord-text hover:bg-white/8'
              }`}
            >
              🎨 All
            </button>

            {freePacks.map(pack => (
              <button
                key={pack.id}
                onClick={() => setActivePack(pack.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  activePack === pack.id
                    ? 'bg-discord-brand text-white shadow-md shadow-discord-brand/30'
                    : 'bg-white/5 text-discord-muted hover:text-discord-text hover:bg-white/8'
                }`}
              >
                {pack.label}
              </button>
            ))}

            {supaPacks.length > 0 && (
              <div className="w-px bg-white/10 mx-1 flex-shrink-0" />
            )}

            {supaPacks.map(pack => (
              <button
                key={pack.id}
                onClick={() => setActivePack(pack.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1 ${
                  activePack === pack.id
                    ? isSupa
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-purple-900/50 text-purple-300 border border-purple-500/40'
                    : isSupa
                      ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/40'
                      : 'bg-white/3 text-discord-muted opacity-60'
                }`}
              >
                {!isSupa && <FiLock size={9} />}
                {pack.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {activePack !== 'all' && BADGE_PACKS.find(p => p.id === activePack)?.supa && !isSupa ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-purple-900/30 border border-purple-500/30 rounded-2xl flex items-center justify-center text-3xl">
                🔒
              </div>
              <p className="text-discord-text font-bold text-sm">Supa Exclusive Pack</p>
              <p className="text-discord-muted text-xs max-w-[200px] leading-relaxed">
                Upgrade to Supa to unlock this badge pack and more exclusive perks.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-discord-muted text-sm">No badges found</p>
            </div>
          ) : (
            <div>
              {search || activePack !== 'all' ? (
                <div className="grid grid-cols-5 gap-2">
                  {filtered.map(badge => {
                    const locked = badge.supa && !isSupa;
                    const isSelected = selected === badge.id;
                    return (
                      <BadgeCell
                        key={badge.id}
                        badge={badge}
                        locked={locked}
                        isSelected={isSelected}
                        onClick={() => handleSelect(badge)}
                      />
                    );
                  })}
                </div>
              ) : (
                BADGE_PACKS.map(pack => {
                  const packBadges = BADGES.filter(b => b.category === pack.id);
                  if (packBadges.length === 0) return null;
                  const isPackLocked = pack.supa && !isSupa;
                  return (
                    <div key={pack.id} className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-discord-muted text-xs font-bold uppercase tracking-wider">{pack.label}</span>
                        {isPackLocked && (
                          <span className="flex items-center gap-1 text-purple-400 text-[10px] font-bold bg-purple-900/20 border border-purple-500/25 px-1.5 py-0.5 rounded-full">
                            <FiLock size={8} /> Supa
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {packBadges.map(badge => {
                          const locked = badge.supa && !isSupa;
                          const isSelected = selected === badge.id;
                          return (
                            <BadgeCell
                              key={badge.id}
                              badge={badge}
                              locked={locked}
                              isSelected={isSelected}
                              onClick={() => handleSelect(badge)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

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

function BadgeCell({ badge, locked, isSelected, onClick }) {
  const SvgComp = BADGE_SVG_MAP[badge.svgId];
  return (
    <button
      onClick={onClick}
      title={locked ? `${badge.label} — Supa only` : badge.label}
      disabled={locked}
      className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${
        locked
          ? 'cursor-not-allowed bg-white/2 border-2 border-transparent'
          : isSelected
            ? 'bg-discord-brand/20 border-2 border-discord-brand shadow-md shadow-discord-brand/20'
            : 'bg-white/3 border-2 border-transparent hover:bg-white/6 hover:border-white/10'
      }`}
    >
      {SvgComp && (
        <span
          className={`badge-anim-${badge.animation} inline-block select-none ${locked ? 'opacity-35 grayscale' : ''}`}
          style={{ display: 'inline-block', filter: locked ? 'none' : `drop-shadow(0 0 4px ${badge.glow})` }}
        >
          <SvgComp color={badge.color} size={28} />
        </span>
      )}
      <span className="text-[9px] text-discord-muted leading-tight text-center line-clamp-1">{badge.label}</span>
      {isSelected && !locked && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-discord-brand rounded-full flex items-center justify-center">
          <FiCheck size={9} className="text-white" />
        </div>
      )}
      {locked && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-purple-900/60 rounded-full flex items-center justify-center">
          <FiLock size={8} className="text-purple-400" />
        </div>
      )}
    </button>
  );
}
