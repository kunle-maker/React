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

  const borderColor =
    type === 'error'   ? 'rgba(237,66,69,0.45)' :
    type === 'success' ? 'rgba(87,242,135,0.3)'  :
                         'rgba(255,255,255,0.11)';

  const textColor =
    type === 'error' ? 'rgba(255,190,190,0.95)' : 'rgba(226,229,234,0.95)';

  const toast = document.createElement('div');
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(18,20,26,0.97);
    color: ${textColor};
    padding: 8px 16px 8px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.1px;
    box-shadow: 0 6px 28px rgba(0,0,0,0.6), 0 1px 6px rgba(0,0,0,0.35);
    border: 1px solid ${borderColor};
    opacity: 0;
    transform: translateY(10px) scale(0.95);
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    white-space: nowrap;
    max-width: 88vw;
    overflow: hidden;
    text-overflow: ellipsis;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  `;

  const logo = document.createElement('img');
  logo.src = '/favicon.svg';
  logo.alt = '';
  logo.style.cssText = `
    width: 18px;
    height: 18px;
    border-radius: 5px;
    flex-shrink: 0;
    display: block;
  `;
  logo.onerror = () => { logo.style.display = 'none'; };

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(logo);
  toast.appendChild(text);

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
    }, 220);
  }, 2800);
}

export const toast = {
  success: (msg) => showToast(msg, { type: 'success' }),
  error:   (msg) => showToast(msg, { type: 'error' }),
  info:    (msg) => showToast(msg, { type: 'info' }),
};
