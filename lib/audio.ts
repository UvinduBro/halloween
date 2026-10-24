"use client";

/**
 * Everything here is synthesised with the Web Audio API — no samples.
 * The ambient bed (drone, metallic hum, rare static) only starts after a user gesture.
 */

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  private ambient: { stop: () => void } | null = null;
  private staticTimer: ReturnType<typeof setTimeout> | null = null;
  private noise: AudioBuffer | null = null;

  private ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private noiseSource() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  startAmbient() {
    const ctx = this.ensure();
    if (!ctx || this.ambient) return;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 3);
    out.connect(this.master!);

    // Low drone: two detuned saws through a low-pass, slowly breathing
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 180;
    lp.Q.value = 4;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.18;
    lp.connect(droneGain).connect(out);
    const oscs: OscillatorNode[] = [];
    for (const f of [41.2, 41.6, 61.7]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.connect(lp);
      o.start();
      oscs.push(o);
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    oscs.push(lfo);

    // Distant metallic hum: inharmonic sines with slow tremolo through a band-pass
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 700;
    bp.Q.value = 6;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.025;
    bp.connect(humGain).connect(out);
    for (const f of [233, 347.5, 521.3, 702.9]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(bp);
      o.start();
      oscs.push(o);
    }
    const trem = ctx.createOscillator();
    trem.frequency.value = 0.13;
    const tremGain = ctx.createGain();
    tremGain.gain.value = 0.02;
    trem.connect(tremGain).connect(humGain.gain);
    trem.start();
    oscs.push(trem);

    const scheduleStatic = () => {
      this.staticTimer = setTimeout(() => {
        this.staticBurst();
        scheduleStatic();
      }, 9000 + Math.random() * 22000);
    };
    scheduleStatic();

    this.ambient = {
      stop: () => {
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0, t + 0.8);
        setTimeout(() => {
          oscs.forEach((o) => o.stop());
          out.disconnect();
        }, 900);
        if (this.staticTimer) clearTimeout(this.staticTimer);
      },
    };
  }

  stopAmbient() {
    this.ambient?.stop();
    this.ambient = null;
  }

  staticBurst(duration = 0.15 + Math.random() * 0.25) {
    const ctx = this.ensure();
    if (!ctx) return;
    const src = this.noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.01);
    // crackle: stepped gain
    for (let i = 1; i < 8; i++) g.gain.setValueAtTime(Math.random() * 0.1, t + (duration * i) / 8);
    g.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(hp).connect(g).connect(this.master!);
    src.start(t, Math.random());
    src.stop(t + duration + 0.05);
  }

  /** Breathy, unintelligible whisper: band-passed noise with syllable-like envelopes. */
  whisper(pan = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = this.noiseSource();
    const f1 = ctx.createBiquadFilter();
    f1.type = "bandpass";
    f1.frequency.value = 1400;
    f1.Q.value = 3;
    const f2 = ctx.createBiquadFilter();
    f2.type = "bandpass";
    f2.frequency.value = 2600;
    f2.Q.value = 5;
    const g = ctx.createGain();
    g.gain.value = 0;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    src.connect(f1);
    src.connect(f2);
    f1.connect(g);
    f2.connect(g);
    g.connect(panner).connect(this.master!);
    const syllables = 5 + Math.floor(Math.random() * 4);
    let at = t + 0.05;
    for (let i = 0; i < syllables; i++) {
      const len = 0.08 + Math.random() * 0.14;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.12 + Math.random() * 0.08, at + len * 0.4);
      g.gain.linearRampToValueAtTime(0, at + len);
      f1.frequency.setValueAtTime(900 + Math.random() * 1200, at);
      at += len + Math.random() * 0.06;
    }
    src.start(t);
    src.stop(at + 0.1);
  }

  /** Distant metallic scrape: resonant noise sweep plus a grinding saw glide. */
  scrape() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 1.6;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 18;
    bp.frequency.setValueAtTime(2400, t);
    bp.frequency.exponentialRampToValueAtTime(700, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.15);
    g.gain.linearRampToValueAtTime(0.2, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp).connect(g);

    const saw = ctx.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.setValueAtTime(140, t);
    saw.frequency.exponentialRampToValueAtTime(70, t + dur);
    const sg = ctx.createGain();
    sg.gain.value = 0.04;
    const am = ctx.createOscillator();
    am.frequency.value = 23;
    const amg = ctx.createGain();
    amg.gain.value = 0.04;
    am.connect(amg).connect(sg.gain);
    saw.connect(sg);

    // a little distance: low-pass + feedback delay
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3000;
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    g.connect(lp);
    sg.connect(lp);
    lp.connect(this.master!);
    lp.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(this.master!);

    src.start(t);
    src.stop(t + dur);
    saw.start(t);
    saw.stop(t + dur);
    am.start(t);
    am.stop(t + dur);
  }

  /** Short static crackle used by the static-cut transition. */
  cut() {
    this.staticBurst(0.12);
  }
}

export const audio = new AudioEngine();
