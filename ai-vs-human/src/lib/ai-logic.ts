/**
 * AI 배치 로직 - 72점 요새 전략 (기존 Code.gs 로직 마이그레이션)
 */

import { BOARD_SIZE, SCORE_TABLE } from "./types";

// 같은 숫자의 인근 위치 찾기
export function findAdjacentPosition(
  board: (number | "★" | null)[],
  existingIndex: number,
  number: number
): number {
  // 바로 앞 위치 확인
  if (existingIndex > 0 && board[existingIndex - 1] === null) {
    if (validateAscendingPlacement(board, existingIndex - 1, number)) {
      return existingIndex - 1;
    }
  }

  // 바로 뒤 위치 확인
  if (existingIndex < 19 && board[existingIndex + 1] === null) {
    if (validateAscendingPlacement(board, existingIndex + 1, number)) {
      return existingIndex + 1;
    }
  }

  return -1;
}

// 엄격한 메인 존 연속 오름차순 검사 (같은 숫자도 연속 오름차순으로 인정)
export function checkMainZoneStrictAscending(
  board: (number | "★" | null)[],
  number: number | "★"
): boolean {
  if (number === "★") return true;

  let hasValidPosition = false;

  // 메인 존(인덱스 2~17) 모든 빈칸 검사
  for (let i = 2; i <= 17; i++) {
    if (board[i] === null) {
      let leftValid = true;
      if (i > 0 && board[i - 1] !== null) {
        // 같은 숫자는 허용 (> 사용)
        if (board[i - 1] !== "★" && (board[i - 1] as number) > number) {
          leftValid = false;
        }
      }

      let rightValid = true;
      if (i < 19 && board[i + 1] !== null) {
        // 같은 숫자는 허용 (< 사용)
        if (board[i + 1] !== "★" && (board[i + 1] as number) < number) {
          rightValid = false;
        }
      }

      if (leftValid && rightValid) {
        hasValidPosition = true;
        break;
      }
    }
  }

  return hasValidPosition;
}

// 배치 검증 (같은 숫자도 연속 오름차순으로 인정)
export function validateAscendingPlacement(
  board: (number | "★" | null)[],
  index: number,
  number: number | "★"
): boolean {
  if (board[index] !== null) return false;
  if (number === "★") return true;

  // 왼쪽 인접 숫자 확인 (같은 숫자는 허용: > 대신 >)
  if (index > 0 && board[index - 1] !== null && board[index - 1] !== "★") {
    if ((board[index - 1] as number) > number) {
      return false;
    }
  }

  // 오른쪽 인접 숫자 확인 (같은 숫자는 허용: < 대신 <)
  if (index < 19 && board[index + 1] !== null && board[index + 1] !== "★") {
    if ((board[index + 1] as number) < number) {
      return false;
    }
  }

  return true;
}

// 72점 요새 전략 분석
export function analyze72Strategy(
  board: (number | "★" | null)[],
  currentNumber: number | "★",
  remainingNumbers: (number | "★")[]
) {
  const analysis: {
    main_zone_status: {
      filled_positions: { index: number; value: number | "★" }[];
      empty_positions: number[];
    };
    probability_calculation: {
      less_count: number;
      more_count: number;
      ratio: number;
      suggested_main_zone_index: number;
    };
    optimal_strategy: string;
  } = {
    main_zone_status: {
      filled_positions: [],
      empty_positions: [],
    },
    probability_calculation: {
      less_count: 0,
      more_count: 0,
      ratio: 0.5,
      suggested_main_zone_index: 9,
    },
    optimal_strategy: "",
  };

  // 메인 존(인덱스 2-17) 분석
  const mainZone = board.slice(2, 18);

  for (let i = 0; i < mainZone.length; i++) {
    if (mainZone[i] !== null) {
      analysis.main_zone_status.filled_positions.push({
        index: i + 2,
        value: mainZone[i]!,
      });
    } else {
      analysis.main_zone_status.empty_positions.push(i + 2);
    }
  }

  // 확률 계산 (현재 숫자가 조커가 아닌 경우)
  if (currentNumber !== "★") {
    const numericRemaining = remainingNumbers.filter(
      (n): n is number => n !== "★" && typeof n === "number"
    );
    const lessThanCurrent = numericRemaining.filter(
      (n) => n < currentNumber
    ).length;
    const moreThanCurrent = numericRemaining.filter(
      (n) => n > currentNumber
    ).length;
    const total = lessThanCurrent + moreThanCurrent;

    analysis.probability_calculation = {
      less_count: lessThanCurrent,
      more_count: moreThanCurrent,
      ratio: total > 0 ? lessThanCurrent / total : 0.5,
      suggested_main_zone_index:
        total > 0 ? 2 + Math.floor(15 * (lessThanCurrent / total)) : 9,
    };
  }

  // 전략 결정
  if (currentNumber === 1) {
    analysis.optimal_strategy = "ANCHOR_PLACEMENT_1";
  } else if (currentNumber === 30) {
    analysis.optimal_strategy = "ANCHOR_PLACEMENT_30";
  } else if (currentNumber === "★") {
    analysis.optimal_strategy = "JOKER_BRIDGE_PLACEMENT";
  } else {
    analysis.optimal_strategy = "PROBABILISTIC_MAIN_ZONE";
  }

  return analysis;
}

// 점수 계산
export function calculateScore(board: (number | "★" | null)[]): number {
  const result = calculateOptimalScore(board);
  return result.totalScore;
}

// 동적 프로그래밍을 이용한 점수 계산
export function calculateOptimalScore(board: (number | "★" | null)[]) {
  const filledElements: (number | "★")[] = [];
  const positionMap: number[] = [];

  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] !== null) {
      filledElements.push(board[i]!);
      positionMap.push(i);
    }
  }

  if (filledElements.length === 0) {
    return { totalScore: 0, runs: [] };
  }

  const dp = new Array(filledElements.length);
  const runConfig: { start: number; end: number; score: number }[][] =
    new Array(filledElements.length);

  dp[0] = SCORE_TABLE[1] || 0;
  runConfig[0] = [{ start: 0, end: 0, score: dp[0] }];

  for (let i = 1; i < filledElements.length; i++) {
    let maxScore = 0;
    let bestConfig: { start: number; end: number; score: number }[] = [];

    // 옵션 1: 현재 요소를 단독 런으로 처리
    const singleScore = dp[i - 1] + (SCORE_TABLE[1] || 0);
    if (singleScore > maxScore) {
      maxScore = singleScore;
      bestConfig = [
        ...runConfig[i - 1],
        { start: i, end: i, score: SCORE_TABLE[1] || 0 },
      ];
    }

    // 옵션 2: 이전 요소들과 연결하여 런 확장
    for (let j = i - 1; j >= 0; j--) {
      const runElements = filledElements.slice(j, i + 1);

      if (isValidOptimalRun(runElements)) {
        const runLength = i - j + 1;
        const runScore =
          SCORE_TABLE[Math.min(runLength, SCORE_TABLE.length - 1)] || 0;
        const totalScore = (j > 0 ? dp[j - 1] : 0) + runScore;

        if (totalScore > maxScore) {
          maxScore = totalScore;
          const prevRuns = j > 0 ? runConfig[j - 1] : [];
          bestConfig = [...prevRuns, { start: j, end: i, score: runScore }];
        }
      } else {
        break;
      }
    }

    dp[i] = maxScore;
    runConfig[i] = bestConfig;
  }

  const finalRuns = runConfig[filledElements.length - 1].map((run) => ({
    elements: filledElements.slice(run.start, run.end + 1),
    length: run.end - run.start + 1,
    score: run.score,
    startPos: positionMap[run.start],
  }));

  return {
    totalScore: dp[filledElements.length - 1],
    runs: finalRuns,
  };
}

// 런 유효성 검사
function isValidOptimalRun(elements: (number | "★")[]): boolean {
  if (elements.length <= 1) return true;

  if (!elements.includes("★")) {
    for (let i = 0; i < elements.length - 1; i++) {
      if ((elements[i] as number) > (elements[i + 1] as number)) {
        return false;
      }
    }
    return true;
  }

  return canJokerMakeValidRun(elements);
}

// 조커가 유효한 런을 만들 수 있는지 확인
function canJokerMakeValidRun(elements: (number | "★")[]): boolean {
  const jokerIndices: number[] = [];
  for (let i = 0; i < elements.length; i++) {
    if (elements[i] === "★") {
      jokerIndices.push(i);
    }
  }

  if (jokerIndices.length > 1) {
    return true;
  }

  const jokerIndex = jokerIndices[0];

  let minValue = -Infinity;
  let maxValue = Infinity;

  if (jokerIndex > 0) {
    const leftValue = elements[jokerIndex - 1];
    if (leftValue !== "★") {
      minValue = Math.max(minValue, leftValue as number);
    }
  }

  if (jokerIndex < elements.length - 1) {
    const rightValue = elements[jokerIndex + 1];
    if (rightValue !== "★") {
      maxValue = Math.min(maxValue, rightValue as number);
    }
  }

  if (minValue > maxValue) {
    return false;
  }

  const testElements = [...elements];
  let jokerValue = minValue;

  if (maxValue !== Infinity && minValue !== -Infinity) {
    jokerValue = Math.floor((minValue + maxValue) / 2);
  } else if (maxValue !== Infinity) {
    jokerValue = maxValue - 1;
  } else if (minValue !== -Infinity) {
    jokerValue = minValue + 1;
  } else {
    jokerValue = 15;
  }

  testElements[jokerIndex] = jokerValue;

  for (let i = 0; i < testElements.length - 1; i++) {
    if ((testElements[i] as number) > (testElements[i + 1] as number)) {
      return false;
    }
  }

  return true;
}

// 빈 칸 중 첫 번째 빈 칸 찾기
export function findFirstEmptySlot(board: (number | "★" | null)[]): number {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) return i;
  }
  return -1;
}

// AI 최적 위치 찾기 (72점 요새 전략 기반)
export function findOptimalPosition(
  board: (number | "★" | null)[],
  currentNumber: number | "★",
  remainingNumbers: (number | "★")[]
): { index: number; reason: string; confidence: number } {
  const emptySlots: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] === null) emptySlots.push(i);
  }

  if (emptySlots.length === 0) {
    return { index: -1, reason: "빈 칸 없음", confidence: 0 };
  }

  // 조커(★) 처리 - 가장 필요한 위치에 배치
  if (currentNumber === "★") {
    // 끊긴 연속 구간을 이어줄 수 있는 위치 찾기
    let bestIndex = -1;
    let bestScore = -1;

    for (const idx of emptySlots) {
      const testBoard = [...board];
      testBoard[idx] = "★";
      const score = calculateScore(testBoard);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = idx;
      }
    }

    if (bestIndex !== -1) {
      return {
        index: bestIndex,
        reason: "조커를 배치하여 연속 구간 연결",
        confidence: 95,
      };
    }
  }

  // 같은 숫자 인접 배치 (11-19는 2장씩 있음)
  if (typeof currentNumber === "number" && currentNumber >= 11 && currentNumber <= 19) {
    // 이미 보드에 같은 숫자가 있는지 확인
    const existingIndex = board.findIndex((cell) => cell === currentNumber);

    if (existingIndex !== -1) {
      // 앞 칸과 뒤 칸 중 빈 칸이 있는지 확인
      const beforeIdx = existingIndex - 1;
      const afterIdx = existingIndex + 1;

      let bestAdjacentIdx = -1;
      let bestAdjacentScore = -1;
      let bestAdjacentReason = "";

      // 앞 칸 확인
      if (beforeIdx >= 0 && board[beforeIdx] === null) {
        if (validateAscendingPlacement(board, beforeIdx, currentNumber)) {
          const testBoard = [...board];
          testBoard[beforeIdx] = currentNumber;
          const score = calculateScore(testBoard);
          if (score > bestAdjacentScore) {
            bestAdjacentScore = score;
            bestAdjacentIdx = beforeIdx;
            bestAdjacentReason = `같은 숫자 ${currentNumber}의 앞(${beforeIdx + 1}번 칸)에 인접 배치하여 연속 구간 확장`;
          }
        }
      }

      // 뒤 칸 확인
      if (afterIdx < BOARD_SIZE && board[afterIdx] === null) {
        if (validateAscendingPlacement(board, afterIdx, currentNumber)) {
          const testBoard = [...board];
          testBoard[afterIdx] = currentNumber;
          const score = calculateScore(testBoard);
          if (score > bestAdjacentScore) {
            bestAdjacentScore = score;
            bestAdjacentIdx = afterIdx;
            bestAdjacentReason = `같은 숫자 ${currentNumber}의 뒤(${afterIdx + 1}번 칸)에 인접 배치하여 연속 구간 확장`;
          }
        }
      }

      if (bestAdjacentIdx !== -1) {
        return {
          index: bestAdjacentIdx,
          reason: bestAdjacentReason,
          confidence: 98,
        };
      }
    }
  }

  // 앵커 숫자 처리 (1, 30) - 72점 요새 전략
  if (currentNumber === 1) {
    // 1은 메인 존 시작(인덱스 2, 3번째 칸)에 배치
    if (board[2] === null) {
      return {
        index: 2,
        reason: "최소값 1을 메인 존 시작(3번 칸)에 배치 - 72점 요새 전략",
        confidence: 100,
      };
    }
  }

  if (currentNumber === 30) {
    // 30은 메인 존 끝(인덱스 17, 18번째 칸)에 배치
    if (board[17] === null) {
      return {
        index: 17,
        reason: "최대값 30을 메인 존 끝(18번 칸)에 배치 - 72점 요새 전략",
        confidence: 100,
      };
    }
  }

  // 일반 숫자: 확률 기반 위치 계산
  const numericRemaining = remainingNumbers.filter(
    (n): n is number => n !== "★" && typeof n === "number"
  );
  const lessThanCurrent = numericRemaining.filter((n) => n < (currentNumber as number)).length;
  const moreThanCurrent = numericRemaining.filter((n) => n > (currentNumber as number)).length;
  const total = lessThanCurrent + moreThanCurrent;

  // 확률 기반 이상적인 위치 계산 (메인 존: 2-17)
  const ratio = total > 0 ? lessThanCurrent / total : 0.5;
  const idealIndex = Math.round(2 + 15 * ratio);

  // 유효한 위치 찾기 (오름차순 유지)
  let bestIndex = -1;
  let bestScore = -Infinity;
  let bestReason = "";

  for (const idx of emptySlots) {
    if (!validateAscendingPlacement(board, idx, currentNumber as number)) {
      continue;
    }

    // 점수 시뮬레이션
    const testBoard = [...board];
    testBoard[idx] = currentNumber;
    const score = calculateScore(testBoard);

    // 이상적인 위치와의 거리 고려
    const distanceFromIdeal = Math.abs(idx - idealIndex);
    const positionBonus = (15 - distanceFromIdeal) * 2;
    const totalScore = score + positionBonus;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestIndex = idx;

      // 이유 생성
      if (idx === idealIndex) {
        bestReason = `확률 기반 최적 위치 (남은 숫자 중 ${lessThanCurrent}개 작음, ${moreThanCurrent}개 큼)`;
      } else if (distanceFromIdeal <= 2) {
        bestReason = `최적 위치 근처 배치 (점수: ${score}점)`;
      } else {
        bestReason = `유효한 위치 중 최고 점수 (${score}점)`;
      }
    }
  }

  // 유효한 위치가 없으면 버리는 존(0, 1, 18, 19)에 배치
  if (bestIndex === -1) {
    const discardZones = [0, 1, 18, 19];
    for (const idx of discardZones) {
      if (board[idx] === null) {
        return {
          index: idx,
          reason: "메인 존에 배치 불가, 버림 존에 배치",
          confidence: 30,
        };
      }
    }
    // 아무 빈 칸에라도 배치
    return {
      index: emptySlots[0],
      reason: "남은 유일한 위치에 배치",
      confidence: 10,
    };
  }

  const confidence = Math.min(95, 50 + bestScore);
  return { index: bestIndex, reason: bestReason, confidence };
}

// 덱 생성
export function createDeck(): (number | "★")[] {
  const deck: (number | "★")[] = [];

  // 1-10: 각 1장
  for (let i = 1; i <= 10; i++) deck.push(i);

  // 11-19: 각 2장
  for (let i = 11; i <= 19; i++) {
    deck.push(i);
    deck.push(i);
  }

  // 20-30: 각 1장
  for (let i = 20; i <= 30; i++) deck.push(i);

  // 조커 1장
  deck.push("★");

  return deck;
}

// 덱 셔플
export function shuffleDeck(deck: (number | "★")[]): (number | "★")[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
