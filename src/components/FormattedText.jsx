import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { parseEmojisToHtml } from '../utils/emoji';

let toastTimeout = null;

function showGlobalToast(message) {
  let container = document.getElementById('vx-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'vx-toast-container';
    container.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      z-index: 9999; pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    background: linear-gradient(135deg, #ed4245, #c03537);
    color: white; padding: 10px 20px; border-radius: 20px;
    font-size: 13px; font-weight: 600; letter-spacing: 0.3px;
    box-shadow: 0 4px 20px rgba(237,66,69,0.5), 0 2px 8px rgba(0,0,0,0.4);
    opacity: 0; transform: translateY(12px) scale(0.95);
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    white-space: nowrap;
  `;
  container.innerHTML = '';
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) scale(1)';
  });
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px) scale(0.95)';
    setTimeout(() => { if (container.contains(toast)) container.removeChild(toast); }, 200);
  }, 3000);
}

function EmojiSpan({ text }) {
  const html = parseEmojisToHtml(text);
  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ wordBreak: 'break-word' }}
    />
  );
}

export default function FormattedText({ text, className = '' }) {
  const navigate = useNavigate();
  const [checkingUser, setCheckingUser] = useState(null);

  const handleMentionClick = useCallback(async (e, username) => {
    e.stopPropagation();
    if (checkingUser === username) return;
    setCheckingUser(username);
    try {
      await API.getUser(username);
      navigate(`/profile/${username}`);
    } catch {
      showGlobalToast(`@${username} not found`);
    } finally {
      setCheckingUser(null);
    }
  }, [navigate, checkingUser]);

  if (!text) return null;

  const parts = [];
  let lastIndex = 0;
  const tokenRegex = /(@\w+|#\w+|https?:\/\/[^\s]+)/g;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const val = match[0];
    if (val.startsWith('@')) {
      parts.push({ type: 'mention', value: val });
    } else if (val.startsWith('#')) {
      parts.push({ type: 'hashtag', value: val });
    } else {
      parts.push({ type: 'url', value: val });
    }
    lastIndex = match.index + val.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return (
    <span className={`post-content ${className}`}>
      {parts.map((part, i) => {
        if (part.type === 'mention') {
          const username = part.value.slice(1);
          return (
            <span
              key={i}
              className="mention cursor-pointer"
              onClick={e => handleMentionClick(e, username)}
              style={{ opacity: checkingUser === username ? 0.6 : 1, transition: 'opacity 0.15s' }}
            >
              {part.value}
            </span>
          );
        }
        if (part.type === 'hashtag') {
          const tag = part.value.slice(1);
          return (
            <span
              key={i}
              className="text-discord-brand cursor-pointer hover:underline"
              onClick={e => { e.stopPropagation(); navigate(`/search?tag=${tag}`); }}
            >
              {part.value}
            </span>
          );
        }
        if (part.type === 'url') {
          return (
            <a
              key={i}
              href={part.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {part.value}
            </a>
          );
        }
        return <EmojiSpan key={i} text={part.value} />;
      })}
    </span>
  );
}
