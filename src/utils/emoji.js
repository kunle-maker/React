import twemoji from 'twemoji';

// Apple emoji CDN via jsDelivr (emoji-datasource-apple)
const APPLE_BASE = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/';

function getAppleUrl(emoji) {
  const cps = [...emoji]
    .map(c => c.codePointAt(0).toString(16).toLowerCase())
    .filter(cp => parseInt(cp, 16) !== 0xfe0f);
  return `${APPLE_BASE}${cps.join('-')}.png`;
}

const TWEMOJI_OPTIONS = {
  folder: 'svg',
  ext: '.svg',
  base: 'https://twemoji.maxcdn.com/v/latest/',
  className: 'twemoji',
  // Override the URL callback to use Apple images
  callback: (icon, options) => {
    return `${APPLE_BASE}${icon}.png`;
  },
};

export function parseEmojisToHtml(text) {
  if (!text) return '';
  return twemoji.parse(String(text), TWEMOJI_OPTIONS);
}

export function containsEmoji(text) {
  if (!text) return false;
  const emojiRegex = /\p{Emoji}/u;
  return emojiRegex.test(text);
}

export function getTwemojiUrl(emoji) {
  return getAppleUrl(emoji);
}

export function getAppleEmojiUrl(emoji) {
  return getAppleUrl(emoji);
}

export function getNotoUrl(emoji) {
  const cps = [...emoji]
    .map(c => c.codePointAt(0).toString(16).toLowerCase());
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${cps.join('_')}/512.webp`;
}

export function getEmojiUrl(emoji, isPremium = false) {
  return getAppleUrl(emoji);
}
