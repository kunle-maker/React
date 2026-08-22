import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseEmojisToHtml } from '../utils/emoji';
import API from '../utils/api';
import { showToast } from '../utils/toast';

function EmojiText({ text }) {
  const html = parseEmojisToHtml(text);
  return <span dangerouslySetInnerHTML={{ __html: html }} style={{ wordBreak: 'break-word' }} />;
}

function LinkCard({ url }) {
  let domain = url;
  let favicon = '';
  try {
    const u = new URL(url);
    domain = u.hostname.replace(/^www\./, '');
    favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {}
  const display = url.length > 52 ? url.slice(0, 52) + '…' : url;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-preview-card"
      onClick={e => e.stopPropagation()}
    >
      {favicon && (
        <img
          src={favicon}
          alt=""
          className="link-preview-favicon"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <div className="link-preview-text">
        <span className="link-preview-domain">{domain}</span>
        <span className="link-preview-url">{display}</span>
      </div>
      <span className="link-preview-arrow">↗</span>
    </a>
  );
}

function parseSegments(text) {
  const parts = [];
  const emailRegex = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
  const tokenRegex = /([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}|@\w+|https?:\/\/[^\s]+)/g;
  let lastIdx = 0;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push({ type: 'text', value: text.slice(lastIdx, match.index) });
    const val = match[0];
    if (emailRegex.test(val) && val.includes('.') && !val.startsWith('@')) {
      parts.push({ type: 'email', value: val });
    } else if (val.startsWith('@')) {
      parts.push({ type: 'mention', value: val, username: val.slice(1) });
    } else {
      parts.push({ type: 'url', value: val });
    }
    lastIdx = match.index + val.length;
  }
  if (lastIdx < text.length) parts.push({ type: 'text', value: text.slice(lastIdx) });
  return parts;
}

export default function BotMessage({ text }) {
  const navigate = useNavigate();
  const [checkingUser, setCheckingUser] = useState(null);

  const handleMentionClick = useCallback(async (e, username) => {
    e.stopPropagation();
    if (checkingUser === username) return;
    setCheckingUser(username);
    try {
      await API.checkUser(username);
      navigate(`/profile/${username}`);
    } catch {
      showToast(`@${username} not found`);
    } finally {
      setCheckingUser(null);
    }
  }, [navigate, checkingUser]);

  if (!text) return null;

  const segments = parseSegments(text);
  const urls = segments.filter(s => s.type === 'url').map(s => s.value);

  return (
    <div>
      <div className="whitespace-pre-wrap leading-relaxed text-sm">
        {segments.map((seg, i) => {
          if (seg.type === 'mention') {
            return (
              <span
                key={i}
                className="mention cursor-pointer"
                style={{ opacity: checkingUser === seg.username ? 0.6 : 1, transition: 'opacity 0.15s' }}
                onClick={e => handleMentionClick(e, seg.username)}
              >
                {seg.value}
              </span>
            );
          }
          if (seg.type === 'email') {
            return (
              <a
                key={i}
                href={`mailto:${seg.value}`}
                className="text-blue-400 hover:underline break-all"
                onClick={e => e.stopPropagation()}
              >
                {seg.value}
              </a>
            );
          }
          if (seg.type === 'url') {
            return (
              <a
                key={i}
                href={seg.value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline break-all"
                onClick={e => e.stopPropagation()}
              >
                {seg.value}
              </a>
            );
          }
          return <EmojiText key={i} text={seg.value} />;
        })}
      </div>
      {urls.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2">
          {urls.map((url, i) => <LinkCard key={i} url={url} />)}
        </div>
      )}
    </div>
  );
}
