export class SoundManager {
  private static ctx: AudioContext | null = null;
  private static masterVolume = 0.7;
  private static maxHearDist = 900;
  private static isMuted = false;

  public static init() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public static setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public static setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public static playSpatialGun(
    weaponId: string,
    sourceX: number,
    sourceY: number,
    listenerX: number,
    listenerY: number
  ) {
    if (this.isMuted) return;
    const { volume, pan } = this.calculateSpatial(sourceX, sourceY, listenerX, listenerY);
    if (volume <= 0) return;

    this.init();
    if (!this.ctx) return;

    switch (weaponId) {
      case "pistol":
        this.synthGunshot(320, 0.08, 0.05, 0.45 * volume, pan);
        break;
      case "smg":
        this.synthGunshot(440, 0.06, 0.04, 0.35 * volume, pan);
        break;
      case "rifle":
        this.synthGunshot(210, 0.14, 0.08, 0.55 * volume, pan);
        break;
      case "shotgun":
        this.synthShotgun(volume, pan);
        break;
      default:
        this.synthGunshot(250, 0.1, 0.06, 0.4 * volume, pan);
    }
  }

  public static playHitmarker(isElimination = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(isElimination ? 2400 : 1600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.3 * this.masterVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  public static playReload() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // First click: mag out
    this.synthNoiseClick(0, 0.04, 0.25);
    // Second click: mag in
    this.synthNoiseClick(0.3, 0.05, 0.3);
  }

  public static playFootstep(sourceX: number, sourceY: number, listenerX: number, listenerY: number) {
    if (this.isMuted) return;
    const { volume, pan } = this.calculateSpatial(sourceX, sourceY, listenerX, listenerY);
    if (volume <= 0) return;

    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = "sine";
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.05);

    panner.pan.value = pan;
    gain.gain.setValueAtTime(0.12 * volume * this.masterVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  private static calculateSpatial(
    sx: number,
    sy: number,
    lx: number,
    ly: number
  ): { volume: number; pan: number } {
    const dx = sx - lx;
    const dy = sy - ly;
    const dist = Math.hypot(dx, dy);

    if (dist > this.maxHearDist) {
      return { volume: 0, pan: 0 };
    }

    const volume = Math.max(0, 1 - dist / this.maxHearDist);
    const pan = Math.max(-1, Math.min(1, dx / (this.maxHearDist * 0.6)));

    return { volume, pan };
  }

  private static synthGunshot(
    baseFreq: number,
    duration: number,
    noiseDur: number,
    volume: number,
    pan: number
  ) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Low punch oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + duration);

    panner.pan.value = pan;
    oscGain.gain.setValueAtTime(volume * this.masterVolume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(panner);
    panner.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + duration);

    // High snap noise
    const bufferSize = this.ctx.sampleRate * noiseDur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.7 * this.masterVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

    noise.connect(noiseGain);
    noiseGain.connect(panner);

    noise.start();
  }

  private static synthShotgun(volume: number, pan: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Heavy bass impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc.type = "sine";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    panner.pan.value = pan;
    gain.gain.setValueAtTime(0.6 * volume * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.25);

    // Blast noise
    this.synthNoiseClick(0, 0.18, 0.45 * volume);
  }

  private static synthNoiseClick(delaySec: number, duration: number, volume: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delaySec;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }
}
