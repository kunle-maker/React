import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { parseEmojisToHtml } from '../utils/emoji';
import { showToast } from '../utils/toast';

function EmojiSpan({ text }) {
  const html = parseEmojisToHtml(text);
  return <span dangerouslySetInnerHTML={{ __html: html }} style={{ wordBreak: 'break-word' }} />;
}

function InlineToken({ token, onMentionClick, checkingUser }) {
  if (token.type === 'mention') {
    const username = token.value.slice(1);
    return (
      <span
        className="mention cursor-pointer"
        onClick={e => onMentionClick(e, username)}
        style={{ opacity: checkingUser === username ? 0.6 : 1, transition: 'opacity 0.15s' }}
      >
        {token.value}
      </span>
    );
  }
  if (token.type === 'hashtag') {
    return null;
  }
  if (token.type === 'email') {
    return (
      <a
        href={`mailto:${token.value}`}
        className="text-blue-400 hover:underline"
        onClick={e => e.stopPropagation()}
      >
        {token.value}
      </a>
    );
  }
  if (token.type === 'url') {
    return (
      <a href={token.value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" onClick={e => e.stopPropagation()}>
        {token.value}
      </a>
    );
  }
  return <EmojiSpan text={token.value} />;
}

function parseInlineTokens(text) {
  const parts = [];
  let lastIndex = 0;
  const emailRegex = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;
  const tokenRegex = /([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}|@\w+|#\w+|https?:\/\/[^\s]+)/g;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    const val = match[0];
    if (emailRegex.test(val) && val.includes('.') && !val.startsWith('@')) {
      parts.push({ type: 'email', value: val });
    } else if (val.startsWith('@')) {
      parts.push({ type: 'mention', value: val });
    } else if (val.startsWith('#')) {
      parts.push({ type: 'hashtag', value: val });
    } else {
      parts.push({ type: 'url', value: val });
    }
    lastIndex = match.index + val.length;
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  return parts;
}

function renderMarkdownSegment(text, key, onMentionClick, checkingUser, navigate) {
  if (!text) return null;

  const segments = [];
  let remaining = text;
  let idx = 0;

  const markdownRegex = /(\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*(.+?)\*|_(.+?)_|`([^`]+)`)/gs;
  let match;
  let lastIdx = 0;
  markdownRegex.lastIndex = 0;

  while ((match = markdownRegex.exec(remaining)) !== null) {
    if (match.index > lastIdx) {
      const plain = remaining.slice(lastIdx, match.index);
      const tokens = parseInlineTokens(plain);
      tokens.forEach((tok, ti) => {
        if (tok.type === 'hashtag') {
          const tag = tok.value.slice(1);
          segments.push(
            <span key={`${key}-plain-${idx++}`} className="text-discord-brand cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); navigate(`/search?tag=${tag}`); }}>
              {tok.value}
            </span>
          );
        } else {
          segments.push(<InlineToken key={`${key}-plain-${idx++}`} token={tok} onMentionClick={onMentionClick} checkingUser={checkingUser} />);
        }
      });
    }

    const full = match[0];
    if (full.startsWith('**') || full.startsWith('__')) {
      const inner = match[2] || match[3];
      segments.push(<strong key={`${key}-bold-${idx++}`} className="font-bold">{inner}</strong>);
    } else if (full.startsWith('~~')) {
      const inner = match[4];
      segments.push(<s key={`${key}-strike-${idx++}`}>{inner}</s>);
    } else if (full.startsWith('*') || full.startsWith('_')) {
      const inner = match[5] || match[6];
      segments.push(<em key={`${key}-italic-${idx++}`} className="italic">{inner}</em>);
    } else if (full.startsWith('`')) {
      const inner = match[7];
      segments.push(
        <code key={`${key}-code-${idx++}`} className="bg-black/30 text-green-400 rounded px-1 py-0.5 text-[0.85em] font-mono border border-white/10">
          {inner}
        </code>
      );
    }

    lastIdx = match.index + full.length;
  }

  if (lastIdx < remaining.length) {
    const plain = remaining.slice(lastIdx);
    const tokens = parseInlineTokens(plain);
    tokens.forEach((tok, ti) => {
      if (tok.type === 'hashtag') {
        const tag = tok.value.slice(1);
        segments.push(
          <span key={`${key}-tail-${idx++}`} className="text-discord-brand cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); navigate(`/search?tag=${tag}`); }}>
            {tok.value}
          </span>
        );
      } else {
        segments.push(<InlineToken key={`${key}-tail-${idx++}`} token={tok} onMentionClick={onMentionClick} checkingUser={checkingUser} />);
      }
    });
  }

  return segments;
}

export default function FormattedText({ text, className = '' }) {
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

  const codeBlockRegex = /```(?:\w+\n)?([\s\S]*?)```/g;
  const blocks = [];
  let lastIndex = 0;
  let match;
  let blockKey = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      const segs = renderMarkdownSegment(segment, `seg-${blockKey}`, handleMentionClick, checkingUser, navigate);
      if (segs?.length) blocks.push(...segs);
      blockKey++;
    }
    const codeContent = match[1].replace(/^\n/, '').replace(/\n$/, '');
    blocks.push(
      <pre key={`code-block-${blockKey++}`} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 my-1 text-green-400 text-[0.82em] font-mono overflow-x-auto whitespace-pre-wrap">
        <code>{codeContent}</code>
      </pre>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const segment = text.slice(lastIndex);
    const segs = renderMarkdownSegment(segment, `seg-${blockKey}`, handleMentionClick, checkingUser, navigate);
    if (segs?.length) blocks.push(...segs);
  }

  return (
    <span className={`post-content ${className}`}>
      {blocks}
    </span>
  );
}
