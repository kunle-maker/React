import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'CONTENTEDITABLE']);

function isTypingInInput() {
  const el = document.activeElement;
  if (!el) return false;
  if (INPUT_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts({ onShowHelp } = {}) {
  const navigate = useNavigate();

  const handler = useCallback((e) => {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'k') {
      e.preventDefault();
      navigate('/search');
      return;
    }

    if (isTypingInInput()) return;

    if (e.key === '?' && !e.shiftKey && !ctrl) {
      e.preventDefault();
      onShowHelp?.();
      return;
    }

    if (e.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('vx:escape'));
      return;
    }

    if (!ctrl && !e.altKey) {
      switch (e.key) {
        case 'n':
        case 'N':
          navigate('/create');
          break;
        case 'h':
        case 'H':
          navigate('/');
          break;
        case 'm':
        case 'M':
          navigate('/messages');
          break;
        case 'g':
        case 'G':
          navigate('/groups');
          break;
        case 's':
        case 'S':
          navigate('/search');
          break;
        case 'p':
        case 'P':
          navigate('/notifications');
          break;
        default:
          break;
      }
    }
  }, [navigate, onShowHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
