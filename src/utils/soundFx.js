/**
 * Sound effects — generated in-browser via Web Audio API.
 * No files to download; works offline too.
 */

let _ctx = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume();
  }
  return _ctx;
}

/**
 * Soft bubble-pop send sound, inspired by Telegram.
 * A sine-wave oscillator that sweeps from ~700 Hz → ~360 Hz in ~80 ms
 * with a fast attack and exponential decay.  Total duration ≈ 120 ms.
 */
export function playSendPop() {
  try {
    const ac = getCtx();
    const now = ac.currentTime;

    // --- primary tone ---
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.075);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.115);

    osc.start(now);
    osc.stop(now + 0.12);

    // --- very subtle 2nd harmonic for body/warmth ---
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.connect(gain2);
    gain2.connect(ac.destination);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1400, now);
    osc2.frequency.exponentialRampToValueAtTime(720, now + 0.06);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc2.start(now);
    osc2.stop(now + 0.09);
  } catch {
    // Silently fail — audio not available or blocked.
  }
}
