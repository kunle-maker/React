import React, { useMemo, forwardRef } from 'react';
import { parseEmojisToHtml } from '../utils/emoji';

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TwemojiTextarea = forwardRef(function TwemojiTextarea(
  { value, placeholder, className = '', wrapperClassName = '', onChange, onKeyDown, onFocus, onBlur, rows, style, ...rest },
  ref
) {
  const mirrorHtml = useMemo(() => {
    if (!value) return '';
    return parseEmojisToHtml(escapeHtml(value)).replace(/\n/g, '<br>');
  }, [value]);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <div
        aria-hidden="true"
        className={`${className} absolute inset-0 pointer-events-none select-none overflow-hidden whitespace-pre-wrap break-words`}
        style={{ zIndex: 0 }}
        dangerouslySetInnerHTML={{
          __html: mirrorHtml || `<span style="color:#949ba4;opacity:0.55">${escapeHtml(placeholder || '')}</span>`,
        }}
      />
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        rows={rows}
        placeholder=""
        className={`${className} relative bg-transparent`}
        style={{ ...style, color: 'transparent', caretColor: '#e2e5ea', zIndex: 1 }}
        {...rest}
      />
    </div>
  );
});

export default TwemojiTextarea;
