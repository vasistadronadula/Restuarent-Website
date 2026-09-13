// Web Audio API helper to generate real-time order chime sound

// Module-level context — browsers cap AudioContext instances per page (~6).
// Creating a new one on every chime exhausted the cap and silenced all
// subsequent notifications. One shared context avoids this, and resuming it
// handles Chrome's autoplay suspension without user interaction being required
// more than once.
let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new AudioContextCtor();
  }
  return _audioCtx;
}

export function playOrderChimeSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume the context if it was suspended by the browser's autoplay policy.
    // If the resume promise rejects (e.g., no user gesture yet on a fresh tab),
    // the chime silently skips — which is better than throwing.
    const schedule = () => {
      const now = ctx.currentTime;

      // Tone 1: High A5 (880 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.3);

      // Tone 2: E6 (1320 Hz) for a pleasant restaurant bell chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(schedule).catch(() => {});
    } else {
      schedule();
    }
  } catch (e) {
    console.warn('Audio chime play blocked by browser autoplay policy:', e);
  }
}
