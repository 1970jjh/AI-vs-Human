/**
 * 게임 효과음 유틸리티 (Web Audio API 사용)
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * 점수 증가 시 '띠링' 효과음
 */
export function playScoreSound(): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 밝고 짧은 띠링 소리
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    oscillator.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.log('Audio not supported');
  }
}

/**
 * 게임 완료 시 '빵빠레' 효과음
 */
export function playFanfareSound(): void {
  try {
    const ctx = getAudioContext();

    // 빵빠레 멜로디 노트들
    const notes = [
      { freq: 523.25, start: 0, duration: 0.15 },      // C5
      { freq: 659.25, start: 0.15, duration: 0.15 },   // E5
      { freq: 783.99, start: 0.3, duration: 0.15 },    // G5
      { freq: 1046.50, start: 0.45, duration: 0.4 },   // C6 (길게)
      { freq: 783.99, start: 0.55, duration: 0.15 },   // G5
      { freq: 1046.50, start: 0.7, duration: 0.5 },    // C6 (마지막, 더 길게)
    ];

    notes.forEach(note => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);
      oscillator.type = 'triangle';

      gainNode.gain.setValueAtTime(0.4, ctx.currentTime + note.start);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.start + note.duration);

      oscillator.start(ctx.currentTime + note.start);
      oscillator.stop(ctx.currentTime + note.start + note.duration);
    });
  } catch (e) {
    console.log('Audio not supported');
  }
}
