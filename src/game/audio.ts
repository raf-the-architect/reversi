/**
 * Synthesized sound engine. Everything is generated with the Web Audio API so
 * the game ships as a single file with no audio assets to download.
 *
 * Sounds are deliberately short and dry: Reversi is a turn-based game and the
 * audio has to stay pleasant across hundreds of moves in a long session.
 */

export type SoundName =
  | "place"
  | "flip"
  | "corner"
  | "pass"
  | "undo"
  | "travelForward"
  | "travelBack"
  | "illegal"
  | "win"
  | "lose"
  | "draw"
  | "start"
  | "hover";

const MUTE_KEY = "neon-reversi-muted";
const VOLUME_KEY = "neon-reversi-volume";

type AudioCtor = typeof AudioContext;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private volumeLevel = 0.7;
  private lastHover = 0;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.muted = window.localStorage.getItem(MUTE_KEY) === "1";
      const stored = Number(window.localStorage.getItem(VOLUME_KEY));
      if (Number.isFinite(stored) && stored > 0) this.volumeLevel = Math.min(1, stored);
    } catch {
      /* storage blocked — sound simply starts at defaults */
    }
  }

  get isMuted() {
    return this.muted;
  }

  get volume() {
    return this.volumeLevel;
  }

  setMuted(value: boolean) {
    this.muted = value;
    try {
      window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setVolume(value: number) {
    this.volumeLevel = Math.min(1, Math.max(0, value));
    if (this.master) this.master.gain.value = this.volumeLevel;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(this.volumeLevel));
    } catch {
      /* ignore */
    }
  }

  /** Must be called from a user gesture (autoplay policy). */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const ctor: AudioCtor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!ctor) return;
      try {
        this.ctx = new ctor();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volumeLevel;
      this.master.connect(this.ctx.destination);

      const frames = Math.floor(this.ctx.sampleRate * 0.4);
      const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private nodes() {
    if (this.muted || !this.ctx || !this.master) return null;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return { ctx: this.ctx, out: this.master };
  }

  private envelope(gain: GainNode, at: number, peak: number, attack: number, decay: number) {
    const g = gain.gain;
    g.setValueAtTime(0.0001, at);
    g.linearRampToValueAtTime(peak, at + attack);
    g.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }

  private tone(
    at: number,
    frequency: number,
    options: { type?: OscillatorType; peak?: number; attack?: number; decay?: number; glideTo?: number } = {},
  ) {
    const nodes = this.nodes();
    if (!nodes) return;
    const { ctx, out } = nodes;
    const osc = ctx.createOscillator();
    osc.type = options.type ?? "sine";
    osc.frequency.setValueAtTime(frequency, at);
    if (options.glideTo) osc.frequency.exponentialRampToValueAtTime(options.glideTo, at + (options.decay ?? 0.2));
    const gain = ctx.createGain();
    this.envelope(gain, at, options.peak ?? 0.2, options.attack ?? 0.005, options.decay ?? 0.18);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + (options.attack ?? 0.005) + (options.decay ?? 0.18) + 0.05);
  }

  private noise(
    at: number,
    options: { type?: BiquadFilterType; frequency?: number; sweepTo?: number; q?: number; peak?: number; decay?: number } = {},
  ) {
    const nodes = this.nodes();
    if (!nodes || !this.noiseBuffer) return;
    const { ctx, out } = nodes;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = options.type ?? "bandpass";
    filter.frequency.setValueAtTime(options.frequency ?? 1600, at);
    if (options.sweepTo) filter.frequency.exponentialRampToValueAtTime(options.sweepTo, at + (options.decay ?? 0.2));
    filter.Q.value = options.q ?? 1;
    const gain = ctx.createGain();
    this.envelope(gain, at, options.peak ?? 0.25, 0.002, options.decay ?? 0.08);
    source.connect(filter).connect(gain).connect(out);
    source.start(at);
    source.stop(at + (options.decay ?? 0.08) + 0.1);
  }

  play(name: SoundName, delayMs = 0) {
    const nodes = this.nodes();
    if (!nodes) return;
    const t = nodes.ctx.currentTime + delayMs / 1000;

    switch (name) {
      case "place": {
        // Ceramic "click" of a disc landing, plus a soft body thump.
        this.noise(t, { frequency: 2100 + Math.random() * 500, q: 1.4, peak: 0.3, decay: 0.05 });
        this.tone(t, 210, { type: "sine", glideTo: 96, peak: 0.28, decay: 0.13 });
        break;
      }
      case "flip": {
        // Bright woodblock tick; pitch rises along the cascade.
        this.noise(t, { frequency: 1250, q: 2.2, peak: 0.16, decay: 0.045 });
        this.tone(t, 430 + Math.random() * 60, { type: "triangle", glideTo: 700, peak: 0.1, decay: 0.07 });
        break;
      }
      case "corner": {
        this.tone(t, 659, { type: "sine", peak: 0.22, decay: 0.5 });
        this.tone(t, 988, { type: "sine", peak: 0.14, decay: 0.42 });
        this.tone(t + 0.06, 1319, { type: "sine", peak: 0.08, decay: 0.35 });
        break;
      }
      case "pass": {
        this.tone(t, 392, { type: "sine", peak: 0.16, decay: 0.16 });
        this.tone(t + 0.13, 294, { type: "sine", peak: 0.14, decay: 0.22 });
        break;
      }
      case "undo": {
        this.noise(t, { type: "lowpass", frequency: 2600, sweepTo: 260, peak: 0.2, decay: 0.28 });
        this.tone(t, 520, { type: "triangle", glideTo: 180, peak: 0.12, decay: 0.24 });
        break;
      }
      case "travelForward": {
        this.tone(t, 540, { type: "triangle", glideTo: 880, peak: 0.11, decay: 0.11 });
        break;
      }
      case "travelBack": {
        this.tone(t, 760, { type: "triangle", glideTo: 420, peak: 0.11, decay: 0.11 });
        break;
      }
      case "illegal": {
        this.tone(t, 150, { type: "square", peak: 0.09, decay: 0.07 });
        this.tone(t + 0.06, 118, { type: "square", peak: 0.07, decay: 0.08 });
        break;
      }
      case "win": {
        [523, 659, 784, 1047].forEach((freq, i) => {
          this.tone(t + i * 0.1, freq, { type: "triangle", peak: 0.18, decay: 0.34 });
        });
        break;
      }
      case "lose": {
        [440, 349, 262].forEach((freq, i) => {
          this.tone(t + i * 0.13, freq, { type: "triangle", peak: 0.16, decay: 0.36 });
        });
        break;
      }
      case "draw": {
        this.tone(t, 494, { type: "triangle", peak: 0.16, decay: 0.3 });
        this.tone(t + 0.12, 494, { type: "triangle", peak: 0.12, decay: 0.34 });
        break;
      }
      case "start": {
        this.tone(t, 392, { type: "triangle", peak: 0.16, decay: 0.16 });
        this.tone(t + 0.09, 587, { type: "triangle", peak: 0.16, decay: 0.24 });
        break;
      }
      case "hover": {
        // Throttled: pointer travel across the board should not become noise.
        const now = performance.now();
        if (now - this.lastHover < 55) return;
        this.lastHover = now;
        this.noise(t, { frequency: 3000, q: 3, peak: 0.05, decay: 0.025 });
        break;
      }
    }
  }

  /**
   * Plays the flip cascade in sync with the visual stagger using sample
   * accurate scheduling instead of a pile of timers.
   */
  cascade(flipCount: number, stepMs: number) {
    const nodes = this.nodes();
    if (!nodes || flipCount <= 0) return;
    const ticks = Math.min(flipCount, 12);
    const base = nodes.ctx.currentTime + 0.03;
    for (let i = 0; i < ticks; i += 1) {
      const at = base + (i * stepMs) / 1000;
      this.noise(at, { frequency: 1200 + i * 55, q: 2.1, peak: 0.13, decay: 0.042 });
      this.tone(at, 420 + i * 34, { type: "triangle", glideTo: 640 + i * 30, peak: 0.08, decay: 0.06 });
    }
  }
}

export const audio = new AudioEngine();
