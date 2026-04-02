import React, { useState } from 'react';
import { FiX, FiGlobe, FiCheck } from 'react-icons/fi';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh-CN', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'id', name: 'Indonesian' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
  { code: 'ha', name: 'Hausa' },
  { code: 'sw', name: 'Swahili' },
];

function cleanMessageText(text) {
  if (!text) return '';
  return text
    .replace(/^\[vx:img:[^\]]+\]\n?/, '')
    .replace(/^\[vx:call:[^\]]+\]\n?/, '')
    .replace(/^\[vx:audio:[^\]]+\]\n?/, '')
    .replace(/^\[vx:video:[^\]]+\]\n?/, '')
    .replace(/^\[vx:file:[^\]]+\]\n?/, '')
    .trim();
}

export default function TranslateModal({ text, onClose }) {
  const [targetLang, setTargetLang] = useState('en');
  const [translated, setTranslated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cleanText = cleanMessageText(text);

  const handleTranslate = async () => {
    if (!cleanText.trim()) return;
    setLoading(true);
    setError(null);
    setTranslated(null);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      const result = data?.[0]?.map(chunk => chunk?.[0]).filter(Boolean).join('') || '';
      if (!result) throw new Error('No translation returned');
      setTranslated(result);
    } catch {
      setError('Could not translate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div
        className="bg-discord-dark rounded-2xl shadow-2xl w-full max-w-sm border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <FiGlobe size={16} className="text-discord-brand" />
            <h3 className="font-bold text-discord-text text-sm">Translate Message</h3>
          </div>
          <button onClick={onClose} className="text-discord-muted hover:text-discord-text transition-colors p-1">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <p className="text-discord-muted text-[11px] font-bold uppercase tracking-wider mb-2">Original</p>
            <div className="bg-white/4 border border-white/6 rounded-xl px-3 py-2.5 text-discord-text text-sm max-h-24 overflow-y-auto">
              {cleanText || <span className="text-discord-muted italic">No text to translate</span>}
            </div>
          </div>

          <div>
            <p className="text-discord-muted text-[11px] font-bold uppercase tracking-wider mb-2">Translate to</p>
            <select
              value={targetLang}
              onChange={e => { setTargetLang(e.target.value); setTranslated(null); setError(null); }}
              className="discord-input w-full text-sm"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>

          {translated && (
            <div>
              <p className="text-discord-muted text-[11px] font-bold uppercase tracking-wider mb-2">Translation</p>
              <div className="bg-discord-brand/10 border border-discord-brand/25 rounded-xl px-3 py-2.5 text-discord-text text-sm max-h-24 overflow-y-auto">
                {translated}
              </div>
            </div>
          )}

          {error && (
            <p className="text-discord-red text-xs text-center">{error}</p>
          )}

          <button
            onClick={handleTranslate}
            disabled={loading || !cleanText.trim()}
            className="w-full py-2.5 rounded-xl bg-discord-brand text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-discord-brand/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><FiGlobe size={14} /> {translated ? 'Translate Again' : 'Translate'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
