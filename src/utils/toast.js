let toastTimeout = null;

export function showToast(message, { type = 'info' } = {}) {
  let container = document.getElementById('vx-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'vx-toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.textContent = message;

  const bg = type === 'error'
    ? 'rgba(30, 30, 38, 0.97)'
    : 'rgba(30, 30, 38, 0.97)';

  toast.style.cssText = `
    background: ${bg};
    color: rgba(255,255,255,0.92);
    padding: 8px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.1px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.55), 0 1px 6px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.09);
    opacity: 0;
    transform: translateY(8px) scale(0.96);
    transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
    white-space: nowrap;
    max-width: 88vw;
    overflow: hidden;
    text-overflow: ellipsis;
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
    toast.style.transform = 'translateY(6px) scale(0.96)';
    setTimeout(() => {
      if (container.contains(toast)) container.removeChild(toast);
    }, 180);
  }, 2800);
}

export const toast = {
  success: (msg) => showToast(msg, { type: 'success' }),
  error: (msg) => showToast(msg, { type: 'error' }),
  info: (msg) => showToast(msg, { type: 'info' }),
};
