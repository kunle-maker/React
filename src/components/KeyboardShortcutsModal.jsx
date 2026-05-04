import React, { useEffect } from 'react';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], label: 'Search', section: 'Navigation' },
  { keys: ['H'], label: 'Go to Feed', section: 'Navigation' },
  { keys: ['M'], label: 'Go to Messages', section: 'Navigation' },
  { keys: ['G'], label: 'Go to Groups', section: 'Navigation' },
  { keys: ['S'], label: 'Go to Search', section: 'Navigation' },
  { keys: ['P'], label: 'Go to Notifications', section: 'Navigation' },
  { keys: ['N'], label: 'New Post', section: 'Actions' },
  { keys: ['?'], label: 'Show Shortcuts', section: 'Actions' },
  { keys: ['Esc'], label: 'Close / Cancel', section: 'Actions' },
];

const sections = [...new Set(SHORTCUTS.map(s => s.section))];

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 bg-white/6 border border-white/12 rounded-md text-[11px] font-bold text-discord-muted font-mono shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-discord-sidebar border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fade-scale-in 0.2s cubic-bezier(0.34,1.3,0.64,1) both' }}
      >
        <style>{`
          @keyframes fade-scale-in {
            from { opacity: 0; transform: scale(0.94); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="font-black text-discord-text text-base">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-discord-muted hover:text-discord-text transition-colors p-1 rounded-lg hover:bg-white/5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {sections.map(section => (
            <div key={section}>
              <p className="text-[10px] font-black text-discord-muted uppercase tracking-widest mb-2">{section}</p>
              <div className="space-y-1">
                {SHORTCUTS.filter(s => s.section === section).map(({ keys, label }) => (
                  <div key={label} className="flex items-center justify-between py-1.5">
                    <span className="text-discord-text text-sm">{label}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((k, i) => (
                        <React.Fragment key={k}>
                          <Kbd>{k}</Kbd>
                          {i < keys.length - 1 && <span className="text-discord-muted text-[10px]">+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 text-center">
          <p className="text-discord-muted text-[11px]">Shortcuts don't work while typing</p>
        </div>
      </div>
    </div>
  );
}
