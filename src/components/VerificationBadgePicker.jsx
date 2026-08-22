import React from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import {
  VERIFIED_BADGE_STYLES, SUPA_BADGE_STYLES,
  VERIFIED_BADGE_SHAPES, SUPA_BADGE_SHAPES,
  VERIFIED_SHAPE_MAP, SUPA_SHAPE_MAP,
  getVerifiedBadgeStyle, getSupaBadgeStyle,
  getStoredVerifiedBadgeStyle, setStoredVerifiedBadgeStyle,
  getStoredVerifiedBadgeShape, setStoredVerifiedBadgeShape,
  getStoredSupaBadgeStyle, setStoredSupaBadgeStyle,
  getStoredSupaBadgeShape, setStoredSupaBadgeShape,
  ShieldSVG, HexSVG,
} from './UserBadge';

export { getSupaBadgeStyle, getStoredSupaBadgeStyle, setStoredSupaBadgeStyle } from './UserBadge';

export default function VerificationBadgePicker({ username, badgeType = 'supa', currentStyleId, onSelect, onClose }) {
  const isVerified = badgeType === 'verified';
  const styles = isVerified ? VERIFIED_BADGE_STYLES : SUPA_BADGE_STYLES;
  const shapes = isVerified ? VERIFIED_BADGE_SHAPES : SUPA_BADGE_SHAPES;
  const svgMap = isVerified ? VERIFIED_SHAPE_MAP : SUPA_SHAPE_MAP;
  const defaultStyleId = isVerified ? 'blue' : 'red';

  const [selectedStyle, setSelectedStyle] = React.useState(currentStyleId || defaultStyleId);
  const [selectedShape, setSelectedShape] = React.useState(() =>
    isVerified ? getStoredVerifiedBadgeShape(username) : getStoredSupaBadgeShape(username)
  );

  const previewStyle = (isVerified ? getVerifiedBadgeStyle : getSupaBadgeStyle)(selectedStyle);
  const PreviewComp = svgMap[selectedShape] || (isVerified ? ShieldSVG : HexSVG);

  const handleConfirm = () => {
    if (isVerified) {
      setStoredVerifiedBadgeStyle(username, selectedStyle);
      setStoredVerifiedBadgeShape(username, selectedShape);
    } else {
      setStoredSupaBadgeStyle(username, selectedStyle);
      setStoredSupaBadgeShape(username, selectedShape);
    }
    onSelect(selectedStyle);
  };

  const title = isVerified ? 'Verification Badge Style' : 'SUPA Badge Style';
  const subtitle = isVerified ? 'Choose your shape and color' : 'Choose your shape and color';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4" onClick={onClose}>
      <div
        className="bg-[#111318] border border-white/8 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
              <PreviewComp color={previewStyle.color} glow={previewStyle.glow} size={24} />
            </div>
            <div>
              <h2 className="font-black text-discord-text text-lg leading-tight">{title}</h2>
              <p className="text-discord-muted text-xs mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          {/* Shape picker */}
          <div>
            <p className="text-discord-muted text-xs font-bold uppercase tracking-widest mb-3 px-1">Badge Shape</p>
            <div className="grid grid-cols-3 gap-3">
              {shapes.map(shape => {
                const ShapeComp = svgMap[shape.id];
                const isActive = selectedShape === shape.id;
                return (
                  <button
                    key={shape.id}
                    onClick={() => setSelectedShape(shape.id)}
                    className={`relative flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl transition-all border-2 ${
                      isActive
                        ? 'border-white/30 bg-white/8 scale-105'
                        : 'border-transparent bg-white/3 hover:bg-white/6'
                    }`}
                    style={isActive ? { boxShadow: `0 0 18px ${previewStyle.glow}` } : {}}
                  >
                    <ShapeComp
                      color={isActive ? previewStyle.color : '#6b7280'}
                      glow={isActive ? previewStyle.glow : 'transparent'}
                      size={42}
                    />
                    <span className={`text-[11px] font-bold leading-tight ${isActive ? 'text-discord-text' : 'text-discord-muted'}`}>
                      {shape.label}
                    </span>
                    {isActive && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <FiCheck size={9} className="text-black" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <p className="text-discord-muted text-xs font-bold uppercase tracking-widest mb-3 px-1">Badge Color</p>
            <div className="grid grid-cols-4 gap-2.5">
              {styles.map(style => {
                const isActive = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all border-2 ${
                      isActive
                        ? 'border-white/30 bg-white/8 scale-105'
                        : 'border-transparent bg-white/3 hover:bg-white/6'
                    }`}
                    style={isActive ? { boxShadow: `0 0 14px ${style.glow}` } : {}}
                  >
                    <PreviewComp color={style.color} glow={style.glow} size={34} />
                    <span className="text-[10px] text-discord-muted font-semibold leading-tight text-center">{style.label}</span>
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <FiCheck size={9} className="text-black" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/6 flex gap-3 flex-shrink-0 bg-[#0d0f14]">
          <button onClick={onClose} className="discord-btn-ghost flex-1 py-3 rounded-xl font-semibold text-sm">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="discord-btn flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <FiCheck size={14} /> Apply Style
          </button>
        </div>
      </div>
    </div>
  );
}
