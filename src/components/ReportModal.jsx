import React, { useState } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import API from '../utils/api';

function TwemojiIcon({ emoji, size = '1.2em' }) {
  if (!emoji || typeof emoji !== 'string') return null;
  try {
    const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
    return (
      <img
        src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${cp}.png`}
        alt={emoji}
        style={{ width: size, height: size }}
        className="select-none object-contain inline-block"
      />
    );
  } catch {
    return <span>{emoji}</span>;
  }
}

const REASONS = [
  { value: 'spam', label: 'Spam', icon: '🚫' },
  { value: 'harassment', label: 'Harassment', icon: '😤' },
  { value: 'hate_speech', label: 'Hate Speech', icon: '⚠️' },
  { value: 'violence', label: 'Violence', icon: '🩸' },
  { value: 'nudity', label: 'Nudity / Sexual', icon: '🔞' },
  { value: 'other', label: 'Something else', icon: '🔍' },
];

export default function ReportModal({ type, targetId, targetName, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      if (type === 'post') await API.reportPost(targetId, reason, details);
      else if (type === 'user') await API.reportUser(targetId, reason, details);
      else if (type === 'group') await API.reportGroup(targetId, reason, details);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-discord-sidebar w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <FiAlertTriangle size={18} className="text-orange-400" />
            <h2 className="text-discord-text font-bold text-base">Report {type}</h2>
          </div>
          <button onClick={onClose} className="text-discord-muted hover:text-discord-text p-1 rounded transition-colors">
            <FiX size={18} />
          </button>
        </div>

        {done ? (
          <div className="px-5 pb-6 pt-2 text-center">
            <div className="text-4xl mb-3"><TwemojiIcon emoji="✅" size="2.5rem" /></div>
            <p className="text-discord-text font-semibold mb-1">Report submitted</p>
            <p className="text-discord-muted text-sm">Our moderation team will review it. If it violates our guidelines, action will be taken.</p>
            <button
              className="mt-5 w-full py-2.5 rounded-xl bg-discord-brand text-white font-semibold text-sm hover:bg-discord-brand/90 transition-colors"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {targetName && (
              <p className="text-discord-muted text-sm px-5 pb-2">Reporting: <span className="text-discord-text font-medium">{targetName}</span></p>
            )}

            <div className="px-5 pb-4">
              <p className="text-discord-muted text-xs font-bold uppercase tracking-wide mb-3">Why are you reporting this?</p>
              <div className="space-y-1.5">
                {REASONS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setReason(r.value)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-left transition-all border ${
                      reason === r.value
                        ? 'bg-discord-brand/15 border-discord-brand text-discord-text'
                        : 'border-transparent hover:bg-discord-hover text-discord-text'
                    }`}
                  >
                    <span className="w-5 flex items-center justify-center"><TwemojiIcon emoji={r.icon} size="1.1rem" /></span>
                    {r.label}
                  </button>
                ))}
              </div>

              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Additional details (optional)..."
                className="discord-input w-full mt-3 resize-none text-sm"
                rows={2}
                maxLength={500}
              />

              {error && <p className="text-discord-red text-xs mt-2">{error}</p>}

              <button
                disabled={!reason || loading}
                onClick={handleSubmit}
                className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: reason ? 'linear-gradient(135deg, #eb459e, #5865f2)' : undefined,
                  backgroundColor: reason ? undefined : '#3a3c43',
                  color: 'white'
                }}
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
