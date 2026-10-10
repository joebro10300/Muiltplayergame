// Procedural Web Audio API Sound Effects Engine for Smash Bros Clone
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Generic tone generator helper
  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.3, pitchDrop = 0) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    if (pitchDrop) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + pitchDrop), now + duration);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Noise generator for impacts and explosions
  playNoise(duration = 0.15, gainVal = 0.3, isExplosion = false) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isExplosion ? 'lowpass' : 'bandpass';
    filter.frequency.value = isExplosion ? 300 : 1200;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  // Sound cues
  hitLight() {
    this.playTone(320, 'triangle', 0.08, 0.4, -120);
    this.playNoise(0.06, 0.15);
  }

  hitMedium() {
    this.playTone(220, 'sawtooth', 0.14, 0.5, -140);
    this.playNoise(0.12, 0.35);
  }

  hitHeavy() {
    // Massive bass drop & impact crunch
    this.playTone(140, 'sawtooth', 0.35, 0.8, -100);
    this.playNoise(0.3, 0.6, true);
  }

  hitSweetspot() {
    // Marth tipper / Falcon knee sharp chime
    this.playTone(1050, 'sine', 0.25, 0.5);
    setTimeout(() => this.playTone(1580, 'sine', 0.2, 0.4), 30);
    this.playNoise(0.15, 0.4);
  }

  jump() {
    this.playTone(280, 'sine', 0.1, 0.25, 200);
  }

  doubleJump() {
    this.playTone(400, 'sine', 0.12, 0.25, 260);
  }

  shieldUp() {
    this.playTone(550, 'sine', 0.08, 0.2, 100);
  }

  shieldHit() {
    this.playTone(180, 'triangle', 0.12, 0.4, -60);
  }

  shieldBreak() {
    // Glass shatter + dizzy tone
    this.playNoise(0.4, 0.7);
    this.playTone(880, 'triangle', 0.5, 0.5, -400);
  }

  dodge() {
    this.playTone(360, 'sine', 0.07, 0.2, -180);
  }

  whoosh() {
    this.playTone(220, 'sine', 0.12, 0.15, -120);
  }

  smashCharge() {
    this.playTone(440, 'triangle', 0.05, 0.15, 80);
  }

  smashRelease() {
    this.playTone(180, 'sawtooth', 0.2, 0.4, -80);
    this.playNoise(0.15, 0.3);
  }

  laser() {
    this.playTone(850, 'sawtooth', 0.09, 0.25, -600);
  }

  fireball() {
    this.playNoise(0.18, 0.3, true);
    this.playTone(260, 'sine', 0.15, 0.2, -100);
  }

  reflector() {
    // Fox shine
    this.playTone(660, 'triangle', 0.12, 0.4, 300);
    setTimeout(() => this.playTone(990, 'sine', 0.15, 0.35), 40);
  }

  thunder() {
    // Pikachu lightning
    this.playTone(120, 'sawtooth', 0.4, 0.7, -80);
    this.playNoise(0.5, 0.8, true);
  }

  swordSlash() {
    this.playTone(720, 'sawtooth', 0.1, 0.25, -400);
    this.playNoise(0.08, 0.2);
  }

  ledgeGrab() {
    this.playTone(440, 'sine', 0.07, 0.3, 100);
  }

  deathBlast() {
    // Screen-clearing explosion
    this.playNoise(0.8, 0.9, true);
    this.playTone(90, 'sawtooth', 0.7, 0.8, -70);
  }

  specialZoom() {
    // Dramatic slowdown stinger
    this.playTone(220, 'sawtooth', 0.4, 0.7, -150);
    this.playTone(110, 'sine', 0.6, 0.8, -50);
  }

  announcerCount(num) {
    const freqs = { 3: 440, 2: 493.88, 1: 523.25, go: 880, game: 330 };
    const f = freqs[num] || 440;
    this.playTone(f, 'square', num === 'go' || num === 'game' ? 0.4 : 0.2, 0.35);
  }

  menuSelect() {
    this.playTone(600, 'sine', 0.06, 0.2, 200);
  }

  menuBack() {
    this.playTone(400, 'sine', 0.06, 0.2, -150);
  }
}

const sounds = new SoundManager();
