import twemoji from 'twemoji';

const TWEMOJI_OPTIONS = {
  folder: 'svg',
  ext: '.svg',
  base: 'https://twemoji.maxcdn.com/v/latest/',
  className: 'twemoji',
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
  const cps = [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => parseInt(cp, 16) !== 0xfe0f);
  return `https://twemoji.maxcdn.com/v/latest/svg/${cps.join('-')}.svg`;
}
