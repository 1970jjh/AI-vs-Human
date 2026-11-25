/**
 * 배경음악: 코드로 합성하는 신스 루프 (음원 파일·저작권 없음)
 * 120BPM, Am–F–C–G 진행. 16분음표 아르페지오 + 베이스 + 킥 + 하이햇.
 */
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let master: GainNode | null = null;

const CHORDS = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [261.63, 329.63, 392.0], // C
  [196.0, 246.94, 293.66], // G
];
const ARP = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, 2];
const STEP = 60 / 120 / 4; // 16분음표 길이(초)

function tone(
  out: AudioNode,
  type: OscillatorType,
  freq: number,
  t: number,
  dur: number,
  vol: number,
  cutoff?: number
) {
  const c = ctx as AudioContext;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  if (cutoff) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    osc.connect(f);
    f.connect(g);
  } else {
    osc.connect(g);
  }
  g.connect(out);
  osc.start(t);
  osc.stop(t + dur);
  return osc;
}

function scheduleStep(out: AudioNode, step: number, t: number) {
  const bar = Math.floor(step / 16) % 4;
  const s = step % 16;
  const chord = CHORDS[bar];
  // 아르페지오 (두 마디마다 뒷부분을 한 옥타브 올려 변주)
  const octave = Math.floor(step / 32) % 2 === 1 && s >= 8 ? 4 : 2;
  tone(out, "sawtooth", chord[ARP[s]] * octave, t, STEP * 0.9, 0.16, 2200);
  // 베이스: 8분음표
  if (s % 2 === 0) tone(out, "square", chord[0] / 2, t, STEP * 1.6, 0.22, 500);
  // 킥: 4분음표 (주파수가 빠르게 떨어지는 사인파)
  if (s % 4 === 0) {
    const k = tone(out, "sine", 140, t, 0.16, 0.7);
    k.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  }
  // 하이햇: 엇박
  if (s % 4 === 2) tone(out, "square", 7000 + ((s * 137) % 900), t, 0.04, 0.05);
}

export function startMusic(): void {
  if (timer) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    const c = ctx;
    if (c.state === "suspended") c.resume();
    const m = c.createGain();
    m.gain.value = 0.18;
    m.connect(c.destination);
    master = m;
    let step = 0;
    let next = c.currentTime + 0.05;
    // 0.1초마다 깨어나 앞으로 0.3초 분량을 미리 예약한다
    timer = setInterval(() => {
      while (next < c.currentTime + 0.3) {
        scheduleStep(m, step++, next);
        next += STEP;
      }
    }, 100);
  } catch (e) {
    console.error("배경음악을 시작하지 못했습니다:", e);
  }
}

export function stopMusic(): void {
  if (timer) clearInterval(timer);
  timer = null;
  if (master) {
    const m = master;
    m.gain.setTargetAtTime(0, m.context.currentTime, 0.1);
    setTimeout(() => m.disconnect(), 600);
  }
  master = null;
}

