/**
 * SoundManager — 외부 파일 없이 Web Audio API로 합성하는 칩튠 효과음.
 * 모바일 정책상 첫 터치에서 unlock()을 호출해야 소리가 난다.
 */
type Wave = OscillatorType;

export class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private holdOsc: OscillatorNode | null = null;
  private holdGain: GainNode | null = null;
  muted = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      // 8비트 느낌을 살짝: 하이컷
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7200;
      this.master.connect(lp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }

  private get ok() {
    return !!this.ctx && !!this.master && !this.muted;
  }

  /** 단음: 주파수 슬라이드 + 짧은 엔벨로프 */
  private tone(freq: number, dur: number, opts: { wave?: Wave; to?: number; vol?: number; delay?: number; attack?: number } = {}) {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.wave ?? 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
    const v = opts.vol ?? 0.5;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** 필터를 통과한 화이트 노이즈 */
  private noise(dur: number, opts: { type?: BiquadFilterType; from?: number; to?: number; q?: number; vol?: number; delay?: number } = {}) {
    if (!this.ok || !this.noiseBuf) return;
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.Q.value = opts.q ?? 1.2;
    f.frequency.setValueAtTime(opts.from ?? 1200, t0);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    const g = ctx.createGain();
    const v = opts.vol ?? 0.5;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.03);
    g.gain.setValueAtTime(v, t0 + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + dur + 0.05);
  }

  // ── 게임 효과음 ──────────────────────────────────────────────
  /** 물 붓기: 쏴아— (밴드패스 노이즈가 낮아지며 차오르는 느낌) */
  pour() {
    this.noise(0.55, { from: 2600, to: 700, q: 0.9, vol: 0.45 });
    this.noise(0.4, { type: 'highpass', from: 5000, vol: 0.12, delay: 0.05 });
  }

  /** 보글보글 알림: 경쾌한 8비트 아르페지오 */
  boil() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.07, { delay: i * 0.055, vol: 0.32 }));
    for (let i = 0; i < 4; i++) this.tone(300 + Math.random() * 200, 0.05, { wave: 'sine', to: 900, delay: 0.35 + i * 0.07, vol: 0.25 });
  }

  /** 면 투하: 퐁당 */
  plop() {
    this.tone(420, 0.16, { wave: 'sine', to: 120, vol: 0.5 });
    this.noise(0.18, { from: 900, to: 300, vol: 0.2, delay: 0.02 });
  }

  /** 토핑 투하: 뾱! */
  pop() {
    this.tone(1200, 0.09, { wave: 'square', to: 380, vol: 0.35 });
    this.tone(1800, 0.05, { wave: 'sine', to: 900, vol: 0.2, delay: 0.03 });
  }

  /** 서빙 & 코인: 찰랑 */
  coin() {
    this.tone(988, 0.08, { vol: 0.32 });
    this.tone(1319, 0.28, { vol: 0.32, delay: 0.07 });
    this.tone(2637, 0.12, { wave: 'triangle', vol: 0.15, delay: 0.12 });
  }

  whoosh() {
    this.noise(0.22, { from: 600, to: 3000, q: 2.5, vol: 0.25 });
  }

  perfect() {
    [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.12, { wave: 'triangle', delay: i * 0.05, vol: 0.3 }));
  }

  /** 피버 타임 팡파르 */
  fanfare() {
    const seq: [number, number][] = [[523, 0], [523, 0.1], [523, 0.2], [698, 0.32], [880, 0.5], [784, 0.62], [1047, 0.78]];
    seq.forEach(([f, d]) => {
      this.tone(f, 0.16, { delay: d, vol: 0.34 });
      this.tone(f / 2, 0.16, { wave: 'triangle', delay: d, vol: 0.25 });
    });
    this.noise(0.5, { type: 'highpass', from: 6000, vol: 0.12, delay: 0.78 });
  }

  click() {
    this.tone(660, 0.04, { vol: 0.2 });
  }

  error() {
    this.tone(180, 0.18, { wave: 'sawtooth', to: 110, vol: 0.3 });
  }

  sizzle() {
    this.noise(0.6, { type: 'highpass', from: 3500, vol: 0.18 });
  }

  scrub() {
    this.noise(0.08, { from: 1800, to: 2600, q: 3, vol: 0.3 });
  }

  splash() {
    this.noise(0.45, { from: 1800, to: 400, vol: 0.45 });
    this.tone(300, 0.2, { wave: 'sine', to: 90, vol: 0.3 });
  }

  meow() {
    this.tone(700, 0.12, { wave: 'triangle', to: 1100, vol: 0.28 });
    this.tone(1100, 0.22, { wave: 'triangle', to: 600, vol: 0.28, delay: 0.12 });
  }

  hiss() {
    this.noise(0.3, { type: 'highpass', from: 4000, vol: 0.3 });
  }

  angry() {
    this.tone(220, 0.12, { wave: 'square', vol: 0.25 });
    this.tone(165, 0.22, { wave: 'square', vol: 0.25, delay: 0.12 });
  }

  buy() {
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.09, { delay: i * 0.06, vol: 0.3 }));
  }

  // ── v2 추가 효과음 ───────────────────────────────────────────
  /** 칼질: 탁! (짧은 노이즈 + 낮은 펄스) */
  chop() {
    this.noise(0.05, { type: 'highpass', from: 2500, vol: 0.45 });
    this.tone(190, 0.05, { wave: 'square', to: 110, vol: 0.3 });
  }

  /** 설거지: 뽀득뽀득 */
  wash() {
    this.noise(0.18, { from: 2400, to: 3600, q: 4, vol: 0.28 });
    this.tone(1400, 0.05, { wave: 'sine', to: 2200, vol: 0.15, delay: 0.06 });
  }

  /** 마지막 10초 째깍 */
  tick(high = false) {
    this.tone(high ? 1500 : 1100, 0.03, { wave: 'square', vol: 0.18 });
  }

  /** 별 획득 (n번째일수록 높게) */
  star(n: number) {
    const base = [784, 988, 1319][Math.min(2, Math.max(0, n))];
    this.tone(base, 0.12, { wave: 'triangle', vol: 0.35 });
    this.tone(base * 1.5, 0.22, { wave: 'triangle', vol: 0.3, delay: 0.08 });
  }

  /** 영수증 출력: 지지직 */
  receipt() {
    for (let i = 0; i < 8; i++) this.noise(0.03, { type: 'highpass', from: 3000, vol: 0.18, delay: i * 0.045 });
  }

  /** 새 기능 해금 */
  unlockJingle() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.1, { wave: 'triangle', delay: i * 0.07, vol: 0.3 }));
  }

  /** 손님 등장 종소리 */
  bell() {
    this.tone(1568, 0.25, { wave: 'triangle', vol: 0.22 });
    this.tone(2093, 0.3, { wave: 'sine', vol: 0.12, delay: 0.02 });
  }

  trash() {
    this.noise(0.2, { from: 900, to: 300, vol: 0.35 });
    this.tone(260, 0.12, { wave: 'square', to: 130, vol: 0.2 });
  }

  /** 영업 종료 호루라기 */
  whistle() {
    this.tone(2200, 0.18, { wave: 'square', vol: 0.22 });
    this.tone(2200, 0.4, { wave: 'square', vol: 0.22, delay: 0.24 });
  }

  /** 슬러시 홀드 중 차오르는 소리 (게이지 0~1을 주파수에 매핑) */
  /** 음식/재료 집어 들기: 짧은 '톡' */
  pick() {
    this.tone(880, 0.05, { wave: 'square', to: 1320, vol: 0.22 });
  }

  /** 선택 취소 */
  unpick() {
    this.tone(660, 0.05, { wave: 'square', to: 440, vol: 0.18 });
  }

  /** 떡볶이 젓기: 국자가 철판을 긁는 소리 */
  stir() {
    this.noise(0.16, { from: 1800, to: 900, q: 3, vol: 0.3 });
    this.noise(0.12, { type: 'bandpass', from: 700, to: 1400, q: 2, vol: 0.2, delay: 0.1 });
  }

  /** 철판 지글지글 (리필) */
  griddle() {
    this.noise(0.5, { type: 'highpass', from: 3500, vol: 0.18 });
    this.tone(220, 0.1, { wave: 'square', to: 160, vol: 0.12 });
  }

  /** 대화창 글자 타이핑 */
  blip() {
    this.tone(1100 + Math.random() * 300, 0.025, { wave: 'square', vol: 0.08 });
  }

  /** 무한 모드 하트 잃음 */
  lifeLost() {
    this.tone(523, 0.12, { wave: 'square', vol: 0.25 });
    this.tone(392, 0.14, { wave: 'square', vol: 0.25, delay: 0.12 });
    this.tone(262, 0.3, { wave: 'triangle', vol: 0.3, delay: 0.26 });
  }

  /** 레버를 잡는 순간: 짧은 금속 딸깍 */
  leverGrab() {
    this.noise(0.03, { type: 'highpass', from: 3000, vol: 0.25 });
    this.tone(330, 0.04, { wave: 'square', vol: 0.2 });
  }

  /** 레버가 스프링으로 튀어 올라가는 '철컥!' — 하강 노이즈 + 띠용 진동 + 금속 타격 */
  spring() {
    this.noise(0.05, { type: 'bandpass', from: 2400, to: 900, q: 3, vol: 0.45 });
    this.tone(180, 0.22, { wave: 'triangle', to: 520, vol: 0.35 });
    this.tone(520, 0.12, { wave: 'square', to: 260, vol: 0.14, delay: 0.05 });
    this.tone(1400, 0.05, { wave: 'square', vol: 0.18, delay: 0.09 });
    this.noise(0.04, { type: 'highpass', from: 4000, vol: 0.3, delay: 0.09 });
  }

  holdStart() {
    if (!this.ok || this.holdOsc) return;
    const ctx = this.ctx!;
    this.holdOsc = ctx.createOscillator();
    this.holdGain = ctx.createGain();
    this.holdOsc.type = 'square';
    this.holdOsc.frequency.value = 220;
    this.holdGain.gain.value = 0.08;
    this.holdOsc.connect(this.holdGain).connect(this.master!);
    this.holdOsc.start();
  }

  holdUpdate(p: number) {
    if (!this.holdOsc || !this.ctx) return;
    // 8비트 느낌의 계단식 상승
    const step = Math.floor(p * 16) / 16;
    this.holdOsc.frequency.setTargetAtTime(220 + step * 660, this.ctx.currentTime, 0.01);
  }

  holdStop() {
    if (!this.holdOsc || !this.ctx || !this.holdGain) return;
    const t = this.ctx.currentTime;
    this.holdGain.gain.setTargetAtTime(0.0001, t, 0.02);
    this.holdOsc.stop(t + 0.1);
    this.holdOsc = null;
    this.holdGain = null;
  }
}
