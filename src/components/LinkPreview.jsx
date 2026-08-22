import React, { useState, useEffect } from 'react';

const previewCache = new Map();

const TRAILING_PUNCT = /[.,!?;:'")\]}>]+$/;
const LEADING_PUNCT = /^[<("'[{]+/;

function isValidTld(tld) {
  return /^[a-zA-Z]{2,}$/.test(tld);
}

function normalizeUrl(raw) {
  const stripped = raw.replace(LEADING_PUNCT, '').replace(TRAILING_PUNCT, '');
  if (!stripped) return null;
  if (/^https?:\/\//i.test(stripped)) return stripped;
  if (/^www\./i.test(stripped)) return 'https://' + stripped;
  const parts = stripped.split('/')[0].split('.');
  if (parts.length >= 2) {
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    if (isValidTld(tld) && /[a-zA-Z]/.test(sld) && sld.length >= 2) {
      return 'https://' + stripped;
    }
  }
  return null;
}

function extractUrls(text) {
  if (!text) return [];
  if (/^\[vx:/.test(text)) return [];
  const tokens = text.split(/[\s\n\r]+/);
  const seen = new Set();
  const results = [];
  for (const token of tokens) {
    const url = normalizeUrl(token);
    if (url && !seen.has(url)) {
      try { new URL(url); seen.add(url); results.push(url); } catch { }
    }
    if (results.length >= 1) break;
  }
  return results;
}

async function fetchPreview(url) {
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&palette=false&audio=false&video=false&iframe=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return buildFallback(url);
    const json = await res.json();
    if (json.status !== 'success') return buildFallback(url);
    const d = json.data;
    return {
      url: d.url || url,
      site: d.publisher || new URL(url).hostname.replace('www.', ''),
      title: d.title || new URL(url).hostname.replace('www.', ''),
      description: d.description || null,
      image: d.image?.url || d.logo?.url || null,
      favicon: `https://www.google.com/s2/favicons?sz=32&domain=${new URL(url).hostname}`,
    };
  } catch {
    return buildFallback(url);
  }
}

function buildFallback(url) {
  try {
    const u = new URL(url);
    return {
      url,
      site: u.hostname.replace('www.', ''),
      title: u.hostname.replace('www.', ''),
      description: null,
      image: null,
      favicon: `https://www.google.com/s2/favicons?sz=32&domain=${u.hostname}`,
    };
  } catch {
    return null;
  }
}

export default function LinkPreview({ text }) {
  const [preview, setPreview] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const urls = extractUrls(text);
  const url = urls[0];

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url));
      setLoaded(true);
      return;
    }
    fetchPreview(url).then(data => {
      if (cancelled) return;
      previewCache.set(url, data);
      setPreview(data);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [url]);

  if (!url || !loaded || !preview) return null;

  const hasImage = preview.image && !preview.image.startsWith('data:');

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 group"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex rounded-xl overflow-hidden bg-[#1a1c23] border border-white/[0.06] hover:border-white/[0.12] transition-colors max-w-sm">
        <div className="w-1 flex-shrink-0 bg-discord-brand rounded-l-xl" />
        <div className="flex flex-1 min-w-0 gap-3 p-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <img
                src={preview.favicon}
                alt=""
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                onError={e => e.target.style.display = 'none'}
              />
              <span className="text-discord-brand text-[11px] font-semibold truncate">{preview.site}</span>
            </div>
            {preview.title && (
              <p className="text-discord-text text-[13px] font-semibold leading-snug line-clamp-2 group-hover:underline decoration-white/40">
                {preview.title}
              </p>
            )}
            {preview.description && (
              <p className="text-discord-muted text-[12px] leading-snug mt-0.5 line-clamp-2">
                {preview.description}
              </p>
            )}
          </div>
          {hasImage && (
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/5">
              <img
                src={preview.image}
                alt=""
                className="w-full h-full object-cover"
                onError={e => e.target.closest('div').style.display = 'none'}
              />
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
