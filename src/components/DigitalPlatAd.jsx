import React, { useState, useEffect, useRef } from 'react';

const AD_INTERVAL_MS = 5 * 60 * 1000;
const FIRST_SHOW_MS = 90 * 1000;

export default function DigitalPlatAd({ currentUser }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const shouldShow = currentUser && !currentUser.isSupa && !currentUser.isVerified;

  useEffect(() => {
    if (!shouldShow) return;

    const first = setTimeout(() => {
      setVisible(true);
      timerRef.current = setInterval(() => {
        setVisible(true);
      }, AD_INTERVAL_MS);
    }, FIRST_SHOW_MS);

    return () => {
      clearTimeout(first);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shouldShow]);

  if (!visible || !shouldShow) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: '420px',
        width: 'calc(100% - 32px)',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        padding: '2px',
        animation: 'dpSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}
    >
      <style>{`
        @keyframes dpSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 4px', borderBottom: '1px solid #1e293b' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sponsored</span>
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}
          aria-label="Close ad"
        >
          ×
        </button>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <a
          href="https://dash.domain.digitalplat.org/signup?ref=konuimkeoF"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 12px',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            background: '#0f172a',
            color: '#f8fafc',
            textDecoration: 'none',
            font: '500 13px/1.25 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
            boxShadow: '0 1px 2px rgba(15,23,42,0.22)',
            width: '100%',
            boxSizing: 'border-box',
          }}
          onClick={() => setVisible(false)}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 8px',
            borderRadius: '9999px',
            background: '#1e293b',
            color: '#93c5fd',
            font: '600 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>DigitalPlat</span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 600 }}>This Website is Powered by DigitalPlat FreeDomain</span>
            <span style={{ color: '#cbd5e1' }}>Get a free domain from DigitalPlat.</span>
          </span>
        </a>
      </div>
    </div>
  );
}
