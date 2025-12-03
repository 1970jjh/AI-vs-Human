import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
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

  // 메인 존 빈칸 분석
  const mainZoneEmpty = [];
  const mainZoneFilled = [];
  for (let i = 2; i <= 17; i++) {
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

  // 보수적 배치 공식: 중앙(10-11번)을 기준으로 더 좁은 범위에서 배치
  // 기존: 3~18 (15칸 범위) → 개선: 4~17 (13칸 범위)로 더 안전하게
  const conservativeIndex = Math.round(4 + 13 * ratio); // 4~17번 칸 범위 (보수적)
  const suggestedIndex = Math.min(17, Math.max(4, conservativeIndex));

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

  const prompt = `당신은 "스트림스" 보드게임의 최고 전문가 AI입니다. **확률 기반 간격 분석**으로 최적의 배치를 결정하세요.

## ★★★ 핵심 원칙: 확률 기반 간격 분석 ★★★
단순히 "사이에 올 수 있는 숫자 개수"가 아니라, **실제로 뽑힐 확률**을 계산하여 간격을 결정합니다.

### 확률 계산 공식
- 기대 뽑힘 개수 = (사이에 올 수 있는 숫자 개수) × (남은 뽑기 횟수 / 남은 총 카드 수)
- 기대값 < 0.5: 뽑힐 확률 낮음 → 바로 옆 또는 1칸 간격 OK
- 기대값 0.5~1.5: 1개 정도 뽑힐 수 있음 → 1~2칸 간격 권장
- 기대값 > 1.5: 여러 개 뽑힐 가능성 높음 → 기대값만큼 간격 필요

### 예시
- 16번 칸에 27이 있고, 현재 숫자 24를 배치할 때
- 24와 27 사이: 25, 26 = 2개
- 남은 카드 38장, 남은 뽑기 18회
- 기대값 = 2 × (18/38) = 0.95개
- 결론: 1개 정도만 뽑힐 확률 → 24는 15번 칸(1칸 앞)에 배치해도 안전!

## 현재 확률 기반 간격 분석 결과
${gapAnalysis || "현재 배치된 숫자가 없거나 간격 문제가 없습니다."}

## 현재 게임 상황
- **턴**: ${turn}/20 (남은 뽑기: ${remainingDraws}회)
- **남은 카드**: ${totalRemainingCards}장
- **현재 숫자**: ${currentNumber}
- **남은 숫자들**: ${remainingInfo || "없음"}${jokerRemaining > 0 ? `, 조커 ${jokerRemaining}개` : ""}
- ${currentNumber}보다 작은 숫자: ${lessCount}개, 큰 숫자: ${moreCount}개

## 절대 금지 사항
- 오름차순 위반 배치 금지 (왼쪽 숫자 ≤ 현재 ≤ 오른쪽 숫자)
- 같은 숫자는 허용 (예: 11 ≤ 11 ≤ 12)

## 목표 전략
- 1차: 16칸 연속 (72점) / 2차: 15칸 (62점) / 3차: 14칸 (53점)

## 구역 정의
- **메인 존**: 3번~18번 칸 (16칸)
- **버림 존**: 1,2번 + 19,20번 칸

## 앵커 배치
- 숫자 1 → 3번 칸 / 숫자 30 → 18번 칸

## 확률 기반 권장 위치
- 기본 권장: ${suggestedIndex}번 칸 (비율 ${(ratio * 100).toFixed(1)}%)
- **확률 분석에 따른 권장 간격: ${recommendedGap}칸**

## 같은 숫자(11~19) 처리
- 두 번째 같은 숫자는 첫 번째와 인접 배치 (사이에 올 숫자의 기대값이 낮을 때)

## 조커(★) 전략
- 끊어진 연결을 이어줄 수 있는 위치에 배치

## 현재 보드 상태
- 보드: ${boardVisualization}
- 메인 존 빈칸: ${mainZoneEmpty.join(", ") || "없음"}
- 메인 존 채워진 칸: ${mainZoneFilled.map(f => `${f.pos}번=${f.value}`).join(", ") || "없음"}

## 의사결정 우선순위
1. **확률 기반 간격 분석**: 기대값에 따라 적절한 간격 결정
2. 숫자 1 → 3번 칸 / 숫자 30 → 18번 칸
3. 같은 숫자(11~19): 기대값이 낮으면 인접 배치
4. 조커 → 연결 최대화 위치
5. 그 외: 확률 분석 결과에 따른 최적 위치

다음 JSON 형식으로만 응답하세요:
{
  "index": <1-20 사이의 칸 번호>,
  "reason": "<확률 분석을 포함한 배치 이유를 한국어로 2-3문장으로 설명>",
  "confidence": <0-100 사이의 신뢰도>,
  "strategy": "<ANCHOR_1 | ANCHOR_30 | PROBABILITY_GAP | PROBABILITY_MAIN | ADJACENT_SAME | JOKER_BRIDGE | BUFFER_DISCARD>"
}`;

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
