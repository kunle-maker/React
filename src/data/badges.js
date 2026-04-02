export const BADGE_PACKS = [
  { id: 'fire',     label: '🔥 Fire',       supa: false },
  { id: 'nature',   label: '🌿 Nature',      supa: false },
  { id: 'space',    label: '🚀 Space',       supa: false },
  { id: 'animals',  label: '🐾 Animals',     supa: false },
  { id: 'power',    label: '⚡ Power',       supa: false },
  { id: 'love',     label: '💖 Love',        supa: false },
  { id: 'cool',     label: '💀 Cool',        supa: false },
  { id: 'rare',     label: '💎 Rare',        supa: false },
  { id: 'elite',    label: '👑 Elite',       supa: true  },
  { id: 'chaos',    label: '🌀 Chaos',       supa: true  },
  { id: 'mystic',   label: '🔮 Mystic',      supa: true  },
];

export const BADGE_CATEGORIES = BADGE_PACKS;

export const BADGES = [
  { id: 'flame',          svgId: 'flame',       color: '#FF6B35', glow: 'rgba(255,107,53,0.65)',  label: 'Flame',          animation: 'pulse',    category: 'fire' },
  { id: 'inferno',        svgId: 'flame',       color: '#FF1744', glow: 'rgba(255,23,68,0.65)',   label: 'Inferno',        animation: 'flicker',  category: 'fire' },
  { id: 'comet',          svgId: 'comet',       color: '#FF6D00', glow: 'rgba(255,109,0,0.6)',    label: 'Comet',          animation: 'streak',   category: 'fire' },
  { id: 'thunder',        svgId: 'lightning',   color: '#FF9800', glow: 'rgba(255,152,0,0.6)',    label: 'Thunder',        animation: 'jitter',   category: 'fire' },
  { id: 'hellfire',       svgId: 'flame',       color: '#BF360C', glow: 'rgba(191,54,12,0.6)',    label: 'Hellfire',       animation: 'glitch',   category: 'fire' },
  { id: 'wildfire',       svgId: 'comet',       color: '#FFAB40', glow: 'rgba(255,171,64,0.6)',   label: 'Wildfire',       animation: 'wave',     category: 'fire' },

  { id: 'leaf',           svgId: 'leaf',        color: '#4CAF50', glow: 'rgba(76,175,80,0.6)',    label: 'Leaf',           animation: 'sway',     category: 'nature' },
  { id: 'snowflake',      svgId: 'snowflake',   color: '#80DEEA', glow: 'rgba(128,222,234,0.6)',  label: 'Snowflake',      animation: 'spin',     category: 'nature' },
  { id: 'bloom',          svgId: 'flower',      color: '#F48FB1', glow: 'rgba(244,143,177,0.6)',  label: 'Blossom',        animation: 'pulse',    category: 'nature' },
  { id: 'sun',            svgId: 'sun',         color: '#FFD54F', glow: 'rgba(255,213,79,0.6)',   label: 'Sunrise',        animation: 'breathe',  category: 'nature' },
  { id: 'sakura',         svgId: 'flower',      color: '#F06292', glow: 'rgba(240,98,146,0.6)',   label: 'Sakura',         animation: 'float',    category: 'nature' },
  { id: 'frosted',        svgId: 'snowflake',   color: '#4FC3F7', glow: 'rgba(79,195,247,0.6)',   label: 'Frosted',        animation: 'twinkle',  category: 'nature' },

  { id: 'rocket',         svgId: 'rocket',      color: '#5C6BC0', glow: 'rgba(92,107,192,0.6)',   label: 'Rocket',         animation: 'launch',   category: 'space' },
  { id: 'planet',         svgId: 'planet',      color: '#7E57C2', glow: 'rgba(126,87,194,0.6)',   label: 'Planet',         animation: 'orbit',    category: 'space' },
  { id: 'nova',           svgId: 'star5',       color: '#FFD700', glow: 'rgba(255,215,0,0.65)',   label: 'Nova',           animation: 'twinkle',  category: 'space' },
  { id: 'moon',           svgId: 'moon',        color: '#B0C4DE', glow: 'rgba(176,196,222,0.6)',  label: 'Moon',           animation: 'float',    category: 'space' },
  { id: 'ufo',            svgId: 'ufo',         color: '#26C6DA', glow: 'rgba(38,198,218,0.6)',   label: 'UFO',            animation: 'sway',     category: 'space' },
  { id: 'galaxy',         svgId: 'galaxy_star', color: '#B39DDB', glow: 'rgba(179,157,219,0.6)',  label: 'Galaxy',         animation: 'rainbow',  category: 'space' },

  { id: 'paw',            svgId: 'paw',         color: '#A1887F', glow: 'rgba(161,136,127,0.6)',  label: 'Paw',            animation: 'bounce',   category: 'animals' },
  { id: 'butterfly',      svgId: 'butterfly',   color: '#7B1FA2', glow: 'rgba(123,31,162,0.6)',   label: 'Butterfly',      animation: 'flutter',  category: 'animals' },
  { id: 'dragon',         svgId: 'dragon',      color: '#E53935', glow: 'rgba(229,57,53,0.6)',    label: 'Dragon',         animation: 'pulse',    category: 'animals' },
  { id: 'phoenix',        svgId: 'butterfly',   color: '#FF7043', glow: 'rgba(255,112,67,0.6)',   label: 'Phoenix',        animation: 'float',    category: 'animals' },
  { id: 'wolf_paw',       svgId: 'paw',         color: '#78909C', glow: 'rgba(120,144,156,0.6)',  label: 'Wolf',           animation: 'howl',     category: 'animals' },
  { id: 'forest_paw',     svgId: 'paw',         color: '#558B2F', glow: 'rgba(85,139,47,0.6)',    label: 'Forest',         animation: 'shake',    category: 'animals' },

  { id: 'lightning',      svgId: 'lightning',   color: '#FFD700', glow: 'rgba(255,215,0,0.65)',   label: 'Lightning',      animation: 'flash',    category: 'power' },
  { id: 'shield',         svgId: 'shield',      color: '#1565C0', glow: 'rgba(21,101,192,0.6)',   label: 'Shield',         animation: 'pulse',    category: 'power' },
  { id: 'sword',          svgId: 'sword',       color: '#90A4AE', glow: 'rgba(144,164,174,0.6)',  label: 'Sword',          animation: 'shake',    category: 'power' },
  { id: 'target',         svgId: 'target',      color: '#F44336', glow: 'rgba(244,67,54,0.6)',    label: 'Target',         animation: 'spin',     category: 'power' },
  { id: 'trophy',         svgId: 'trophy',      color: '#FFD700', glow: 'rgba(255,215,0,0.65)',   label: 'Trophy',         animation: 'float',    category: 'power' },
  { id: 'onyx_blade',     svgId: 'sword',       color: '#37474F', glow: 'rgba(55,71,79,0.5)',     label: 'Onyx Blade',     animation: 'glitch',   category: 'power' },

  { id: 'heart',          svgId: 'heart',       color: '#E91E63', glow: 'rgba(233,30,99,0.65)',   label: 'Heart',          animation: 'heartbeat',category: 'love' },
  { id: 'rose_heart',     svgId: 'heart',       color: '#AD1457', glow: 'rgba(173,20,87,0.6)',    label: 'Rose Heart',     animation: 'pulse',    category: 'love' },
  { id: 'violet_heart',   svgId: 'heart',       color: '#AB47BC', glow: 'rgba(171,71,188,0.6)',   label: 'Violet',         animation: 'float',    category: 'love' },
  { id: 'golden_heart',   svgId: 'heart',       color: '#FFB300', glow: 'rgba(255,179,0,0.6)',    label: 'Golden Heart',   animation: 'tada',     category: 'love' },
  { id: 'love_bloom',     svgId: 'flower',      color: '#FF4081', glow: 'rgba(255,64,129,0.6)',   label: 'Love Bloom',     animation: 'sway',     category: 'love' },

  { id: 'skull',          svgId: 'skull',       color: '#ECEFF1', glow: 'rgba(236,239,241,0.5)',  label: 'Skull',          animation: 'shake',    category: 'cool' },
  { id: 'obsidian_skull', svgId: 'skull',       color: '#546E7A', glow: 'rgba(84,110,122,0.5)',   label: 'Obsidian',       animation: 'glitch',   category: 'cool' },
  { id: 'music_note',     svgId: 'music',       color: '#00BCD4', glow: 'rgba(0,188,212,0.6)',    label: 'Music',          animation: 'bounce',   category: 'cool' },
  { id: 'ghost',          svgId: 'ghost',       color: '#B0BEC5', glow: 'rgba(176,190,197,0.55)', label: 'Ghost',          animation: 'float',    category: 'cool' },
  { id: 'eye_cool',       svgId: 'eye',         color: '#00ACC1', glow: 'rgba(0,172,193,0.6)',    label: 'Watching',       animation: 'pulse',    category: 'cool' },

  { id: 'gem',            svgId: 'gem',         color: '#00E5FF', glow: 'rgba(0,229,255,0.65)',   label: 'Gem',            animation: 'rainbow',  category: 'rare' },
  { id: 'blood_gem',      svgId: 'gem',         color: '#FF1744', glow: 'rgba(255,23,68,0.65)',   label: 'Blood Gem',      animation: 'pulse',    category: 'rare' },
  { id: 'crown_rare',     svgId: 'crown',       color: '#FFD700', glow: 'rgba(255,215,0,0.65)',   label: 'Crown',          animation: 'float',    category: 'rare' },
  { id: 'infinity',       svgId: 'infinity',    color: '#9C27B0', glow: 'rgba(156,39,176,0.6)',   label: 'Infinity',       animation: 'orbit',    category: 'rare' },
  { id: 'diamond',        svgId: 'diamond',     color: '#40C4FF', glow: 'rgba(64,196,255,0.65)',  label: 'Diamond',        animation: 'twinkle',  category: 'rare' },

  { id: 'elite_crown',    svgId: 'crown',       color: '#FF9800', glow: 'rgba(255,152,0,0.7)',    label: 'Elite Crown',    animation: 'spiral',   category: 'elite', supa: true },
  { id: 'elite_gem',      svgId: 'crystal',     color: '#E040FB', glow: 'rgba(224,64,251,0.7)',   label: 'Crystal',        animation: 'elastic',  category: 'elite', supa: true },
  { id: 'elite_diamond',  svgId: 'diamond',     color: '#FFD740', glow: 'rgba(255,215,64,0.7)',   label: 'Elite Diamond',  animation: 'rainbow',  category: 'elite', supa: true },
  { id: 'elite_star',     svgId: 'star5',       color: '#FF6E40', glow: 'rgba(255,110,64,0.7)',   label: 'Supernova',      animation: 'crazy',    category: 'elite', supa: true },
  { id: 'elite_shield',   svgId: 'shield',      color: '#AA00FF', glow: 'rgba(170,0,255,0.7)',    label: 'Arcane Shield',  animation: 'wobble',   category: 'elite', supa: true },
  { id: 'elite_sword',    svgId: 'sword',       color: '#FFD700', glow: 'rgba(255,215,0,0.7)',    label: 'Golden Blade',   animation: 'tada',     category: 'elite', supa: true },

  { id: 'chaos_vortex',   svgId: 'vortex',      color: '#7B1FA2', glow: 'rgba(123,31,162,0.7)',   label: 'Chaos',          animation: 'crazy',    category: 'chaos', supa: true },
  { id: 'chaos_eye',      svgId: 'eye',         color: '#D50000', glow: 'rgba(213,0,0,0.7)',      label: 'Evil Eye',       animation: 'glitch',   category: 'chaos', supa: true },
  { id: 'chaos_skull',    svgId: 'skull',       color: '#FF1744', glow: 'rgba(255,23,68,0.7)',    label: 'Cursed Skull',   animation: 'shake',    category: 'chaos', supa: true },
  { id: 'chaos_comet',    svgId: 'comet',       color: '#AA00FF', glow: 'rgba(170,0,255,0.7)',    label: 'Dark Comet',     animation: 'spiral',   category: 'chaos', supa: true },
  { id: 'chaos_storm',    svgId: 'lightning',   color: '#6200EA', glow: 'rgba(98,0,234,0.7)',     label: 'Dark Storm',     animation: 'elastic',  category: 'chaos', supa: true },
  { id: 'chaos_moon',     svgId: 'moon',        color: '#4A148C', glow: 'rgba(74,20,140,0.7)',    label: 'Blood Moon',     animation: 'wobble',   category: 'chaos', supa: true },

  { id: 'mystic_eye',     svgId: 'eye',         color: '#00BCD4', glow: 'rgba(0,188,212,0.7)',    label: 'Third Eye',      animation: 'pulse',    category: 'mystic', supa: true },
  { id: 'mystic_orb',     svgId: 'vortex',      color: '#3F51B5', glow: 'rgba(63,81,181,0.7)',    label: 'Mystic Orb',     animation: 'orbit',    category: 'mystic', supa: true },
  { id: 'mystic_moon',    svgId: 'moon',        color: '#9575CD', glow: 'rgba(149,117,205,0.7)',  label: 'Witch Moon',     animation: 'float',    category: 'mystic', supa: true },
  { id: 'mystic_star',    svgId: 'star5',       color: '#1DE9B6', glow: 'rgba(29,233,182,0.7)',   label: 'Oracle Star',    animation: 'spiral',   category: 'mystic', supa: true },
  { id: 'mystic_crystal', svgId: 'crystal',     color: '#80CBC4', glow: 'rgba(128,203,196,0.7)',  label: 'Spirit Crystal', animation: 'twinkle',  category: 'mystic', supa: true },
  { id: 'mystic_galaxy',  svgId: 'galaxy_star', color: '#7C4DFF', glow: 'rgba(124,77,255,0.7)',   label: 'Cosmos',         animation: 'rainbow',  category: 'mystic', supa: true },
];

export function getBadgeById(id) {
  return BADGES.find(b => b.id === id) || null;
}
