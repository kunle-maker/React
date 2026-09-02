// Apple emoji CDN via jsDelivr (emoji-datasource-apple)
const APPLE_BASE = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/';

function getAppleUrl(emoji) {
  const cps = [...emoji]
    .map(c => c.codePointAt(0).toString(16).toLowerCase())
    .filter(cp => parseInt(cp, 16) !== 0xfe0f);
  return `${APPLE_BASE}${cps.join('-')}.png`;
}

// Matches any emoji sequence (ZWJ sequences, skin tone variants, flags, etc.)
// Uses Unicode property escapes — works in all modern browsers
const EMOJI_REGEX = /\p{Emoji_Presentation}(\u200D\p{Emoji_Presentation})*|\p{Emoji}\uFE0F(\u200D(\p{Emoji}\uFE0F?))*|\p{Regional_Indicator}{2}/gu;

/**
 * Replaces emoji characters in text with Apple CDN <img> tags.
 * Drop-in replacement for twemoji.parse() — no external CDN dependency.
 */
export function parseEmojisToHtml(text) {
  if (!text) return '';
  const str = String(text);
  return str.replace(EMOJI_REGEX, (match) => {
    try {
      const url = getAppleUrl(match);
      return `<img src="${url}" alt="${match}" class="twemoji" style="height:1.2em;width:1.2em;display:inline-block;vertical-align:-0.2em;object-fit:contain;" draggable="false" loading="lazy" />`;
    } catch {
      return match;
    }
  });
}

export function containsEmoji(text) {
  if (!text) return false;
  return /\p{Emoji}/u.test(text);
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
