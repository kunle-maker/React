import React, { useState, useEffect } from 'react';

const previewCache = new Map();

function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s]+/g;
  return [...new Set(text.match(urlRegex) || [])].slice(0, 1);
}

export default function LinkPreview({ text }) {
  const [preview, setPreview] = useState(null);
  const urls = extractUrls(text);
  const url = urls[0];

  useEffect(() => {
    if (!url) return;
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url));
      return;
    }
    const p = buildSimplePreview(url);
    previewCache.set(url, p);
    setPreview(p);
  }, [url]);

  if (!preview) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-preview-card block mt-2 hover:opacity-90 transition-opacity"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex gap-3">
        {preview.favicon && (
          <img src={preview.favicon} alt="" className="w-4 h-4 mt-0.5 flex-shrink-0" onError={e => e.target.remove()} />
        )}
        <div className="min-w-0">
          <div className="text-discord-muted text-xs mb-1 truncate">{preview.site}</div>
          <div className="text-discord-text text-sm font-semibold truncate">{preview.title}</div>
          <div className="text-discord-muted text-xs truncate">{preview.url}</div>
        </div>
      </div>
    </a>
  );
}

function buildSimplePreview(url) {
  try {
    const u = new URL(url);
    return {
      url,
      site: u.hostname.replace('www.', ''),
      title: u.hostname.replace('www.', ''),
      favicon: `https://www.google.com/s2/favicons?sz=16&domain=${u.hostname}`
    };
  } catch {
    return null;
  }
}
