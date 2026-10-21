import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-3.8-flash",
});

export interface AIAnalysisRequest {
  board: (number | "★" | null)[];
  currentNumber: number | "★";
  usedNumbers: (number | "★")[];
  remainingNumbers: (number | "★")[];
  turn: number;
}

export interface AIAnalysisResponse {
  index: number;
  reason: string;
  confidence: number;
  strategy: string;
}

export async function getAIDecision(
  request: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  const { board, currentNumber, usedNumbers, remainingNumbers, turn } = request;

  // 보드 상태를 시각화
  const boardVisualization = board
    .map((cell, idx) => {
      if (cell === null) return `[${idx + 1}:빈칸]`;
      return `[${idx + 1}:${cell}]`;
    })
    .join(" ");

  // 빈 칸 목록
  const emptySlots = board
    .map((cell, idx) => (cell === null ? idx + 1 : null))
    .filter((idx) => idx !== null);

  // 메인 존 빈칸 분석 (3번~17번 칸 = 15칸이 메인 존)
  const mainZoneEmpty = [];
  const mainZoneFilled = [];
  for (let i = 2; i <= 16; i++) { // 3번~17번 칸 (인덱스 2~16)
    if (board[i] === null) {
      mainZoneEmpty.push(i + 1);
    } else {
      mainZoneFilled.push({ pos: i + 1, value: board[i] });
    }
  }

  // 남은 숫자 중 현재 숫자보다 작은/큰 숫자 계산
  const numericRemaining = remainingNumbers.filter((n): n is number => typeof n === "number");
  const currentNum = typeof currentNumber === "number" ? currentNumber : 15;
  const lessCount = numericRemaining.filter(n => n < currentNum).length;
  const moreCount = numericRemaining.filter(n => n > currentNum).length;
  const total = lessCount + moreCount;
  const ratio = total > 0 ? lessCount / total : 0.5;

  // ★★★ 제1원칙: 메인 존 3~17번 칸 (15칸) 기반 배치 공식 ★★★
  // 앵커: 1,2 → 3~4번 칸 / 29,30 → 16~17번 칸
  // 중간 숫자는 5~15번 칸에 확률적으로 배치 (11칸 범위)
  const conservativeIndex = Math.round(5 + 10 * ratio); // 5~15번 칸 범위 (중간 숫자용)
  const suggestedIndex = Math.min(15, Math.max(5, conservativeIndex));

  // ★★★ 핵심 분석: 확률 기반 간격 분석 (Probability-based Gap Analysis) ★★★
  const placedNumbers: { pos: number; value: number }[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null && board[i] !== "★") {
      placedNumbers.push({ pos: i + 1, value: board[i] as number });
    }
  }
  placedNumbers.sort((a, b) => a.pos - b.pos);

  // 확률 계산을 위한 기본 값
  const totalRemainingCards = remainingNumbers.length; // 남은 총 카드 수
  const remainingDraws = 20 - turn; // 앞으로 뽑을 기회

  // 현재 숫자가 숫자인 경우, 확률 기반 간격 분석
  let gapAnalysis = "";
  let recommendedGap = 0; // 권장 간격

  if (typeof currentNumber === "number" && placedNumbers.length > 0) {
    // 현재 숫자보다 작은 배치된 숫자들 중 가장 큰 것
    const smallerPlaced = placedNumbers.filter(p => p.value <= currentNumber);
    // 현재 숫자보다 큰 배치된 숫자들 중 가장 작은 것
    const largerPlaced = placedNumbers.filter(p => p.value >= currentNumber);

    if (smallerPlaced.length > 0) {
      const nearest = smallerPlaced[smallerPlaced.length - 1];
      const numbersBetweenList = numericRemaining.filter(
        n => n > nearest.value && n < currentNumber
      );
      const sameNumberRemaining = currentNumber >= 11 && currentNumber <= 19
        ? numericRemaining.filter(n => n === currentNumber).length
        : 0;
      const totalPossible = numbersBetweenList.length + sameNumberRemaining;

      if (totalPossible > 0) {
        // 확률 계산: 이 숫자들이 실제로 뽑힐 기대값
        const expectedDraws = totalPossible * (remainingDraws / totalRemainingCards);
        const probability = Math.min(1, expectedDraws / totalPossible) * 100;

        // 기대값에 따른 권장 간격 계산
        const suggestedGapForSmaller = Math.ceil(expectedDraws);

        gapAnalysis += `\n📊 [왼쪽 간격 분석] ${nearest.pos}번 칸의 ${nearest.value}와 현재 숫자 ${currentNumber} 사이:`;
        gapAnalysis += `\n   • 사이에 올 수 있는 숫자: ${numbersBetweenList.join(', ')}${sameNumberRemaining > 0 ? `, ${currentNumber}(동일 숫자 ${sameNumberRemaining}장)` : ''} = 총 ${totalPossible}개`;
        gapAnalysis += `\n   • 남은 카드: ${totalRemainingCards}장, 남은 뽑기: ${remainingDraws}회`;
        gapAnalysis += `\n   • 기대 뽑힘 개수: ${expectedDraws.toFixed(1)}개 (확률 ${probability.toFixed(0)}%)`;

        if (expectedDraws < 0.5) {
          gapAnalysis += `\n   ✅ 결론: 뽑힐 확률이 낮으므로 ${nearest.pos}번 칸 바로 옆 또는 1칸 띄워 배치해도 안전`;
          recommendedGap = Math.max(recommendedGap, 1);
        } else if (expectedDraws < 1.5) {
          gapAnalysis += `\n   ⚠️ 결론: 1개 정도 뽑힐 수 있으므로 1~2칸 간격 권장`;
          recommendedGap = Math.max(recommendedGap, 2);
        } else {
          gapAnalysis += `\n   🚨 결론: ${Math.round(expectedDraws)}개 이상 뽑힐 가능성 높음! 최소 ${suggestedGapForSmaller}칸 이상 간격 필요`;
          recommendedGap = Math.max(recommendedGap, suggestedGapForSmaller);
        }
      }
    }

    if (largerPlaced.length > 0) {
      const nearest = largerPlaced[0];
      const numbersBetweenList = numericRemaining.filter(
        n => n > currentNumber && n < nearest.value
      );
      const sameNumberRemaining = currentNumber >= 11 && currentNumber <= 19
        ? numericRemaining.filter(n => n === currentNumber).length
        : 0;
      const totalPossible = numbersBetweenList.length + sameNumberRemaining;

      if (totalPossible > 0) {
        const expectedDraws = totalPossible * (remainingDraws / totalRemainingCards);
        const probability = Math.min(1, expectedDraws / totalPossible) * 100;
        const suggestedGapForLarger = Math.ceil(expectedDraws);

        gapAnalysis += `\n📊 [오른쪽 간격 분석] 현재 숫자 ${currentNumber}와 ${nearest.pos}번 칸의 ${nearest.value} 사이:`;
        gapAnalysis += `\n   • 사이에 올 수 있는 숫자: ${numbersBetweenList.join(', ')}${sameNumberRemaining > 0 ? `, ${currentNumber}(동일 숫자 ${sameNumberRemaining}장)` : ''} = 총 ${totalPossible}개`;
        gapAnalysis += `\n   • 남은 카드: ${totalRemainingCards}장, 남은 뽑기: ${remainingDraws}회`;
        gapAnalysis += `\n   • 기대 뽑힘 개수: ${expectedDraws.toFixed(1)}개 (확률 ${probability.toFixed(0)}%)`;

        if (expectedDraws < 0.5) {
          gapAnalysis += `\n   ✅ 결론: 뽑힐 확률이 낮으므로 ${nearest.pos}번 칸 바로 앞 또는 1칸 앞에 배치해도 안전`;
          recommendedGap = Math.max(recommendedGap, 1);
        } else if (expectedDraws < 1.5) {
          gapAnalysis += `\n   ⚠️ 결론: 1개 정도 뽑힐 수 있으므로 1~2칸 간격 권장`;
          recommendedGap = Math.max(recommendedGap, 2);
        } else {
          gapAnalysis += `\n   🚨 결론: ${Math.round(expectedDraws)}개 이상 뽑힐 가능성 높음! 최소 ${suggestedGapForLarger}칸 이상 간격 필요`;
          recommendedGap = Math.max(recommendedGap, suggestedGapForLarger);
        }
      }
    }
  }

  // 남은 숫자 상세 정보
  const remainingInfo = numericRemaining.sort((a, b) => a - b).join(', ');
  const jokerRemaining = remainingNumbers.filter(n => n === "★").length;

  // ★★★ 핵심 분석: 시퀀스 파괴 감지 및 버퍼존 전략 ★★★
  let sequenceBreakAnalysis = "";
  let isOrphanNumber = false; // 메인 시퀀스에 끼울 수 없는 "고아 숫자"인지
  let recommendedBufferZone: "left" | "right" | null = null;

  if (typeof currentNumber === "number" && placedNumbers.length > 0) {
    // 현재 숫자보다 큰 숫자가 배치된 위치들
    const largerOnBoard = placedNumbers.filter(p => p.value > currentNumber);
    // 현재 숫자보다 작은 숫자가 배치된 위치들
    const smallerOnBoard = placedNumbers.filter(p => p.value < currentNumber);

    if (largerOnBoard.length > 0 && smallerOnBoard.length > 0) {
      // 현재 숫자보다 큰 것 중 가장 작은 값 (바로 위 숫자)
      const nextLarger = largerOnBoard.reduce((min, p) => p.value < min.value ? p : min);
      // 현재 숫자보다 작은 것 중 가장 큰 값 (바로 아래 숫자)
      const nextSmaller = smallerOnBoard.reduce((max, p) => p.value > max.value ? p : max);

      // 정상적인 경우: 작은 숫자 위치 < 큰 숫자 위치
      // 문제 상황: 작은 숫자 위치 > 큰 숫자 위치 (이미 역전됨)
      // 또는: 작은 숫자 위치와 큰 숫자 위치 사이에 빈칸이 없음

      const availableSlotsBetween = emptySlots.filter(
        slot => slot > nextSmaller.pos && slot < nextLarger.pos
      );

      if (nextSmaller.pos > nextLarger.pos) {
        // 이미 역전된 상황: 현재 숫자는 끼워넣을 곳이 없음
        isOrphanNumber = true;
        sequenceBreakAnalysis = `\n🚨 [시퀀스 파괴 감지] 현재 숫자 ${currentNumber}을 배치할 곳이 없습니다!`;
        sequenceBreakAnalysis += `\n   • ${nextSmaller.pos}번 칸에 ${nextSmaller.value}(작은값)가 이미 오른쪽에 있음`;
        sequenceBreakAnalysis += `\n   • ${nextLarger.pos}번 칸에 ${nextLarger.value}(큰값)가 이미 왼쪽에 있음`;
        sequenceBreakAnalysis += `\n   → 메인 시퀀스에 끼울 수 없는 "고아 숫자"입니다!`;
        sequenceBreakAnalysis += `\n   → 버퍼존(1~2번 또는 18~20번 칸)에 배치하세요!`;
        recommendedBufferZone = currentNumber < 15 ? "left" : "right";
      } else if (availableSlotsBetween.length === 0 && nextLarger.pos - nextSmaller.pos === 1) {
        // 바로 붙어있고 사이에 빈칸이 없음
        isOrphanNumber = true;
        sequenceBreakAnalysis = `\n🚨 [시퀀스 파괴 감지] ${nextSmaller.value}(${nextSmaller.pos}번)과 ${nextLarger.value}(${nextLarger.pos}번) 사이에 빈칸이 없습니다!`;
        sequenceBreakAnalysis += `\n   • 현재 숫자 ${currentNumber}은 이 두 숫자 사이에 들어가야 하지만 공간이 없음`;
        sequenceBreakAnalysis += `\n   → 버퍼존에 배치하여 메인 시퀀스를 보존하세요!`;
        recommendedBufferZone = currentNumber < 15 ? "left" : "right";
      }
    }

    // 더 복잡한 케이스: 현재 숫자가 이미 배치된 "작은 값" 뒤에 들어가야 하는데, 그 뒤에 더 작은 값이 있는 경우
    // 예: 14가 11번칸에 있고, 16이 13번칸에 있는데, 13을 뽑음
    // 13은 14보다 작으므로 14(11번칸) 앞에 와야 함
    // 하지만 14 앞(10번칸 이하)에 빈칸이 있어도, 그 앞에 이미 큰 숫자가 있으면 안됨

    if (!isOrphanNumber && largerOnBoard.length > 0) {
      const nextLarger = largerOnBoard.reduce((min, p) => p.value < min.value ? p : min);

      // 현재 숫자는 nextLarger 앞에 와야 함
      // nextLarger 앞의 빈칸들 찾기
      const slotsBeforeLarger = emptySlots.filter(slot => slot < nextLarger.pos);

      // 그 빈칸들 앞에 현재 숫자보다 큰 값이 있는지 확인
      for (const slot of slotsBeforeLarger) {
        const numbersBeforeSlot = placedNumbers.filter(p => p.pos < slot);
        const hasLargerBefore = numbersBeforeSlot.some(p => p.value > currentNumber);

        if (hasLargerBefore) {
          // 이 슬롯은 사용 불가 - 앞에 더 큰 숫자가 있음
          continue;
        }
      }

      // 유효한 슬롯이 없으면 고아 숫자
      const validSlots = slotsBeforeLarger.filter(slot => {
        const numbersBeforeSlot = placedNumbers.filter(p => p.pos < slot);
        return !numbersBeforeSlot.some(p => p.value > currentNumber);
      });

      if (validSlots.length === 0 && slotsBeforeLarger.length > 0) {
        isOrphanNumber = true;
        sequenceBreakAnalysis = `\n🚨 [시퀀스 파괴 감지] 현재 숫자 ${currentNumber}을 ${nextLarger.value}(${nextLarger.pos}번) 앞에 배치할 수 없습니다!`;
        sequenceBreakAnalysis += `\n   • ${nextLarger.pos}번 칸 앞의 모든 빈칸에는 이미 ${currentNumber}보다 큰 숫자가 앞에 있음`;
        sequenceBreakAnalysis += `\n   → 메인 시퀀스에 끼울 수 없는 "고아 숫자"입니다!`;
        sequenceBreakAnalysis += `\n   → 버퍼존(1~2번 또는 18~20번 칸)에 배치하세요!`;
        recommendedBufferZone = "left";
      }
    }
  }

  // 버퍼존 상태 확인 (메인 존 3~17번 외부)
  const leftBuffer = [1, 2].filter(i => board[i - 1] === null); // 왼쪽 버퍼존
  const rightBuffer = [18, 19, 20].filter(i => board[i - 1] === null); // 오른쪽 버퍼존

  const prompt = `당신은 "스트림스" 보드게임의 최고 전문가 AI입니다.

## ★★★★★ 제1원칙 (최우선 전략) ★★★★★
**연속 15칸 오름차순 달성이 최종 목표입니다!**

### 앵커 배치 규칙 (가장 중요!)
- **숫자 1 또는 2** → **3번 또는 4번 칸**에 배치 (왼쪽 앵커)
- **숫자 29 또는 30** → **16번 또는 17번 칸**에 배치 (오른쪽 앵커)
- 이 앵커들이 메인 존(3~17번)의 양 끝을 잡아줍니다!

### 구역 정의
- **메인 존**: 3번~17번 칸 (15칸) ← 연속 오름차순 목표!
- **버퍼 존(버림 존)**: 1번, 2번 + 18번, 19번, 20번 칸

### 목표 전략
- **1차 목표**: 연속 15칸 오름차순 (3~17번 칸)
- **2차 목표**: 연속 14칸 (15칸이 어려울 때)
- **3차 목표**: 연속 13칸

## 확률 기반 간격 분석
중간 숫자(3~28)는 확률적으로 배치합니다.

### 확률 계산 공식
- 기대 뽑힘 개수 = (사이에 올 수 있는 숫자 개수) × (남은 뽑기 횟수 / 남은 총 카드 수)
- 기대값 < 0.5: 뽑힐 확률 낮음 → 바로 옆 또는 1칸 간격 OK
- 기대값 0.5~1.5: 1개 정도 뽑힐 수 있음 → 1~2칸 간격 권장
- 기대값 > 1.5: 여러 개 뽑힐 가능성 높음 → 기대값만큼 간격 필요

## 현재 확률 기반 간격 분석 결과
${gapAnalysis || "현재 배치된 숫자가 없거나 간격 문제가 없습니다."}

## 고아 숫자 판정 및 버퍼존 전략
**메인 시퀀스를 깨는 것은 최악의 선택입니다!**

### 고아 숫자(Orphan Number)란?
- 현재 숫자가 이미 배치된 숫자들 사이에 들어갈 수 없을 때
- 예: 14가 11번칸에, 16이 13번칸에 있는데 13이 뽑힘
  - 13은 14보다 작으므로 14 앞에 와야 하지만, 이미 시퀀스가 형성됨
  - 이런 경우 13은 "고아 숫자" → 버퍼존에 버려야 함!

### 버퍼존 사용
- **왼쪽 버퍼존**: 1번, 2번 칸 (작은 고아 숫자용)
- **오른쪽 버퍼존**: 18번, 19번, 20번 칸 (큰 고아 숫자용)
- 버퍼존 빈칸: 왼쪽 [${leftBuffer.join(', ') || '없음'}], 오른쪽 [${rightBuffer.join(', ') || '없음'}]

### 현재 시퀀스 파괴 분석
${sequenceBreakAnalysis || "✅ 현재 숫자는 메인 시퀀스에 안전하게 배치 가능합니다."}
${isOrphanNumber ? `\n⚠️ **고아 숫자 감지!** → ${recommendedBufferZone === "left" ? "왼쪽 버퍼존(1~2번)" : "오른쪽 버퍼존(18~20번)"}에 배치하세요!` : ""}

## 현재 게임 상황
- **턴**: ${turn}/20 (남은 뽑기: ${remainingDraws}회)
- **남은 카드**: ${totalRemainingCards}장
- **현재 숫자**: ${currentNumber}
- **남은 숫자들**: ${remainingInfo || "없음"}${jokerRemaining > 0 ? `, 조커 ${jokerRemaining}개` : ""}
- ${currentNumber}보다 작은 숫자: ${lessCount}개, 큰 숫자: ${moreCount}개

## 절대 금지 사항
- 오름차순 위반 배치 금지 (왼쪽 숫자 ≤ 현재 ≤ 오른쪽 숫자)
- 같은 숫자는 허용 (예: 11 ≤ 11 ≤ 12)

## 확률 기반 권장 위치
- 기본 권장: ${suggestedIndex}번 칸 (비율 ${(ratio * 100).toFixed(1)}%)
- **확률 분석에 따른 권장 간격: ${recommendedGap}칸**

## 현재 보드 상태
- 보드: ${boardVisualization}
- 메인 존(3~17번) 빈칸: ${mainZoneEmpty.join(", ") || "없음"}
- 메인 존 채워진 칸: ${mainZoneFilled.map(f => `${f.pos}번=${f.value}`).join(", ") || "없음"}

## 의사결정 우선순위 (중요도 순)
1. **🎯 앵커 배치** (최우선!): 1,2 → 3~4번 칸 / 29,30 → 16~17번 칸
2. **🚨 고아 숫자 판정**: 메인 시퀀스에 끼울 수 없으면 즉시 버퍼존으로!
3. **시퀀스 보존**: 기존 오름차순 시퀀스를 절대 깨지 않는 위치 선택
4. **확률 기반 간격 분석**: 기대값에 따라 적절한 간격 결정
5. 같은 숫자(11~19): 기대값이 낮으면 인접 배치
6. 조커(★) → 끊어진 연결을 이어줄 수 있는 위치

다음 JSON 형식으로만 응답하세요:
{
  "index": <1-20 사이의 칸 번호>,
  "reason": "<배치 이유를 한국어로 2-3문장으로 설명>",
  "confidence": <0-100 사이의 신뢰도>,
  "strategy": "<ANCHOR_LOW | ANCHOR_HIGH | ORPHAN_BUFFER | PROBABILITY_GAP | ADJACENT_SAME | JOKER_BRIDGE | BUFFER_DISCARD>"
}

**전략 설명:**
- ANCHOR_LOW: 앵커 숫자(1, 2)를 3~4번 칸에 배치
- ANCHOR_HIGH: 앵커 숫자(29, 30)를 16~17번 칸에 배치
- ORPHAN_BUFFER: 고아 숫자를 버퍼존에 배치하여 메인 시퀀스 보존
- PROBABILITY_GAP: 확률 기반 간격 분석에 따른 중간 숫자 배치
- ADJACENT_SAME: 같은 숫자(11~19) 인접 배치
- JOKER_BRIDGE: 조커로 끊어진 시퀀스 연결
- BUFFER_DISCARD: 메인 존에 맞지 않아 버퍼존에 버리는 배치`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        index: parsed.index - 1, // 0-based index로 변환
        reason: parsed.reason,
        confidence: parsed.confidence,
        strategy: parsed.strategy,
      };
    }

    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Gemini API error:", error);
    // 폴백: 첫 번째 빈 칸에 배치
    const fallbackIndex = board.findIndex((cell) => cell === null);
    return {
      index: fallbackIndex,
      reason: "API 오류로 인해 기본 위치에 배치합니다.",
      confidence: 10,
      strategy: "FALLBACK",
    };
  }
}
