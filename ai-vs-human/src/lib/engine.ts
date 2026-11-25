/**
 * 몬테카를로 판단 엔진
 *
 * 빈칸마다 "지금 숫자를 여기에 두면 남은 판이 어떻게 끝나는가"를
 * 남은 카드로 수백 번 가상 진행해 보고, 기대 점수와 15칸 이상 연속 확률을 잰다.
 * 같은 가상 미래(카드 순서)를 모든 빈칸에 똑같이 적용해 공정하게 비교한다.
 */
import { BOARD_SIZE } from "./types";
import { calculateOptimalScore } from "./ai-logic";

type Card = number | "★";
type Cell = Card | null;

export interface SlotEval {
  index: number; // 0-based
  ev: number; // 기대 점수
  p15: number; // 15칸 이상 연속 확률(0~1)
  longest: number; // 평균 최장 연속 길이
}

export interface EngineResult {
  best: SlotEval;
  ranked: SlotEval[]; // ev 내림차순
  rollouts: number;
}

const bufferSize = (): number => (globalThis as any).__BUFFER ?? 2;

// 숫자별 덱 내 순위 비율(0~1): 1~10·20~30은 1장, 11~19는 2장
const RANK: Record<number, number> = (() => {
  const vals: number[] = [];
  for (let i = 1; i <= 10; i++) vals.push(i);
  for (let i = 11; i <= 19; i++) vals.push(i, i);
  for (let i = 20; i <= 30; i++) vals.push(i);
  const out: Record<number, number> = {};
  for (let v = 1; v <= 30; v++) {
    const below = vals.filter((x) => x < v).length;
    const same = vals.filter((x) => x === v).length;
    out[v] = (below + (same - 1) / 2) / (vals.length - 1);
  }
  return out;
})();

// 시드 고정 난수 (같은 판면이면 같은 결과)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(cards: Card[], rnd: () => number): Card[] {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 가장 가까운 왼쪽/오른쪽 숫자 (조커는 건너뜀)
function nearestLeft(board: Cell[], i: number): number {
  for (let k = i - 1; k >= 0; k--) {
    const c = board[k];
    if (typeof c === "number") return c;
  }
  return 0;
}
function nearestRight(board: Cell[], i: number): number {
  for (let k = i + 1; k < BOARD_SIZE; k++) {
    const c = board[k];
    if (typeof c === "number") return c;
  }
  return 31;
}

/**
 * 가상 진행용 빠른 배치 정책:
 * 1) 앞뒤 숫자 사이에 오름차순으로 들어갈 빈 구간 중 가장 넓은 곳을 고르고
 * 2) 그 구간 안에서 "앞으로 올 작은/큰 숫자 개수" 비율만큼 띄워 놓는다.
 * 3) 들어갈 곳이 없으면(고아 숫자) 피해가 가장 적은 빈칸에 버린다.
 */
function rolloutPlace(board: Cell[], v: Card, unseen: Card[]): number {
  const empties: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) if (board[i] === null) empties.push(i);
  if (empties.length === 0) return -1;

  if (v === "★") {
    // 조커: 양옆이 차 있는 1칸 틈 → 연결 효과 최대
    for (const i of empties) {
      if (i > 0 && i < BOARD_SIZE - 1 && board[i - 1] !== null && board[i + 1] !== null) return i;
    }
    return empties[Math.floor(empties.length / 2)];
  }

  // 빈 구간(연속 빈칸 묶음)별로 오름차순 가능 여부 판단
  let bestGap: { a: number; b: number; lo: number; hi: number } | null = null;
  let i = 0;
  while (i < BOARD_SIZE) {
    if (board[i] !== null) { i++; continue; }
    const a = i;
    while (i < BOARD_SIZE && board[i] === null) i++;
    const b = i - 1;
    const lo = nearestLeft(board, a);
    const hi = nearestRight(board, b);
    if (lo <= v && v <= hi && (!bestGap || b - a > bestGap.b - bestGap.a)) {
      bestGap = { a, b, lo, hi };
    }
  }

  if (bestGap && (globalThis as any).__ROLL_POLICY === "rank") {
    // 덱 전체에서의 순위 비율로 이상적 위치를 정하고, 구간 안 가장 가까운 칸
    const ideal = Math.round(RANK[v] * (BOARD_SIZE - 1));
    return Math.min(bestGap.b, Math.max(bestGap.a, ideal));
  }

  if (bestGap) {
    const { lo, hi } = bestGap;
    let { a, b } = bestGap;
    // 양끝 2칸(1·2번, 19·20번)은 고아 숫자를 버릴 칸으로 남겨 둔다 → 메인 존 3~18번(16칸)
    if (a === 0) a = Math.min(bufferSize(), b);
    if (b === BOARD_SIZE - 1) b = Math.max(BOARD_SIZE - 1 - bufferSize(), a);
    let below = 0, above = 0;
    for (const c of unseen) {
      if (c === "★") continue;
      if (c >= lo && c < v) below++;
      else if (c > v && c <= hi) above++;
      else if (c === v) { below += 0.5; above += 0.5; }
    }
    const tot = below + above;
    const ratio = tot > 0 ? below / tot : 0.5;
    return a + Math.round((b - a) * ratio);
  }

  // 고아 숫자: 양끝 버퍼 쪽 빈칸 중 이웃과 덜 충돌하는 곳
  const score = (k: number) => {
    const l = k > 0 ? board[k - 1] : null;
    const r = k < BOARD_SIZE - 1 ? board[k + 1] : null;
    let s = Math.min(k, BOARD_SIZE - 1 - k); // 가장자리일수록 작음
    if (typeof l === "number" && l > v) s += 5;
    if (typeof r === "number" && r < v) s += 5;
    return s;
  };
  return empties.reduce((best, k) => (score(k) < score(best) ? k : best), empties[0]);
}

function longestRun(board: Cell[]): number {
  const { runs } = calculateOptimalScore(board);
  return runs.reduce((m, r) => Math.max(m, r.length), 0);
}

/**
 * @param board 현재 보드(20칸)
 * @param current 방금 뽑힌 카드
 * @param unseen 아직 안 나온 카드 전체(현재 카드 제외)
 * @param drawsLeft 이번 수 이후 남은 뽑기 횟수
 */
export function evaluateSlots(
  board: Cell[],
  current: Card,
  unseen: Card[],
  drawsLeft: number,
  rollouts = 300
): EngineResult {
  const empties: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) if (board[i] === null) empties.push(i);

  // 시드: 판면이 같으면 같은 미래 집합
  const seed = board.reduce<number>((h, c, i) => (h * 31 + (c === null ? 0 : c === "★" ? 99 : c) * (i + 7)) | 0, 17)
    + (current === "★" ? 99 : current);
  const rnd = mulberry32(seed);
  const futures: Card[][] = [];
  for (let r = 0; r < rollouts; r++) futures.push(shuffled(unseen, rnd).slice(0, drawsLeft));

  const run = (index: number, list: Card[][]) => {
    let sum = 0, hit15 = 0, sumLongest = 0;
    for (const future of list) {
      const b: Cell[] = [...board];
      b[index] = current;
      const pool = [...unseen];
      for (const card of future) {
        const k = pool.indexOf(card);
        if (k >= 0) pool.splice(k, 1);
        const pos = rolloutPlace(b, card, pool);
        if (pos >= 0) b[pos] = card;
      }
      const { totalScore, runs } = calculateOptimalScore(b);
      const longest = runs.reduce((m, r) => Math.max(m, r.length), 0);
      sum += totalScore;
      sumLongest += longest;
      if (longest >= 15) hit15++;
    }
    return { sum, hit15, sumLongest, n: list.length };
  };

  // 1단계: 모든 빈칸을 같은 미래로 훑는다
  const acc = new Map(empties.map((index) => [index, run(index, futures)]));
  // 2단계: 상위 후보만 추가 미래로 더 정밀하게 (접전인 칸을 가려내기 위함)
  const extraN: number = (globalThis as any).__EXTRA ?? 0;
  if (extraN > 0 && empties.length > 1) {
    const extra: Card[][] = [];
    for (let r = 0; r < extraN; r++) extra.push(shuffled(unseen, rnd).slice(0, drawsLeft));
    const top = Array.from(acc.entries()).sort((x, y) => y[1].sum - x[1].sum).slice(0, 4);
    for (const [index, base] of top) {
      const more = run(index, extra);
      acc.set(index, {
        sum: base.sum + more.sum, hit15: base.hit15 + more.hit15,
        sumLongest: base.sumLongest + more.sumLongest, n: base.n + more.n,
      });
    }
    // 1단계만 돈 칸은 순위에서 상위 4개 뒤로 (표본이 달라 직접 비교하지 않는다)
    const topSet = new Set(top.map(([i]) => i));
    const toEval = ([index, v]: [number, { sum: number; hit15: number; sumLongest: number; n: number }]): SlotEval =>
      ({ index, ev: v.sum / v.n, p15: v.hit15 / v.n, longest: v.sumLongest / v.n });
    const head = Array.from(acc.entries()).filter(([i]) => topSet.has(i)).map(toEval).sort((x, y) => y.ev - x.ev || y.p15 - x.p15);
    const tail = Array.from(acc.entries()).filter(([i]) => !topSet.has(i)).map(toEval).sort((x, y) => y.ev - x.ev);
    const ranked = [...head, ...tail];
    return { best: ranked[0], ranked, rollouts: rollouts + extraN };
  }
  const evals: SlotEval[] = Array.from(acc.entries()).map(([index, v]) =>
    ({ index, ev: v.sum / v.n, p15: v.hit15 / v.n, longest: v.sumLongest / v.n }));

  evals.sort((x, y) => y.ev - x.ev || y.p15 - x.p15);
  return { best: evals[0], ranked: evals, rollouts };
}

// 엔진만으로 내리는 결정 (Gemini OFF·오류 시 사용)
export function engineDecision(board: Cell[], current: Card, unseen: Card[], drawsLeft: number) {
  const { best, ranked } = evaluateSlots(board, current, unseen, drawsLeft);
  const second = ranked[1];
  const gapText = second ? `2위보다 +${(best.ev - second.ev).toFixed(1)}점, ` : "";
  return {
    index: best.index,
    reason: `남은 카드로 가상 게임 300회를 끝까지 진행한 결과, ${best.index + 1}번 칸의 기대 점수가 ${best.ev.toFixed(1)}점으로 가장 높습니다(${gapText}15칸 이상 연속 확률 ${(best.p15 * 100).toFixed(0)}%).`,
    confidence: Math.round(Math.min(99, 60 + best.p15 * 40)),
    strategy: "SIMULATION",
  };
}

export { longestRun };

export interface Outlook {
  low: number; // 보수: 가상 게임 하위 20% 지점의 최종 점수
  mid: number; // 중립: 중앙값
  high: number; // 긍정: 상위 20% 지점의 최종 점수
}

// 지금 숫자를 index 칸에 둔 뒤, 남은 판을 가상으로 끝까지 진행했을 때의 최종 점수 분포
export function slotOutlook(
  board: Cell[],
  current: Card,
  unseen: Card[],
  drawsLeft: number,
  index: number,
  rollouts = 400
): Outlook {
  const rnd = mulberry32(index * 7919 + drawsLeft * 31 + 5);
  const scores: number[] = [];
  for (let r = 0; r < rollouts; r++) {
    const b: Cell[] = [...board];
    b[index] = current;
    const pool = shuffled(unseen, rnd);
    for (let d = 0; d < drawsLeft && pool.length > 0; d++) {
      const card = pool.pop() as Card;
      const pos = rolloutPlace(b, card, pool);
      if (pos >= 0) b[pos] = card;
    }
    scores.push(calculateOptimalScore(b).totalScore);
  }
  scores.sort((x, y) => x - y);
  const at = (q: number) => scores[Math.min(scores.length - 1, Math.floor(q * scores.length))];
  return { low: at(0.2), mid: at(0.5), high: at(0.8) };
}
