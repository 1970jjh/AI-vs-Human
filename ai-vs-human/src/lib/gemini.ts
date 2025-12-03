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

  // ★★★ 핵심 분석: 간격 분석 (Gap Analysis) ★★★
  // 배치된 숫자들과 현재 숫자 사이에 들어올 수 있는 남은 숫자 계산
  const placedNumbers: { pos: number; value: number }[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null && board[i] !== "★") {
      placedNumbers.push({ pos: i + 1, value: board[i] as number });
    }
  }
  placedNumbers.sort((a, b) => a.pos - b.pos);

  // 현재 숫자가 숫자인 경우, 인접 배치 시 간격 분석
  let gapAnalysis = "";
  if (typeof currentNumber === "number" && placedNumbers.length > 0) {
    // 현재 숫자보다 작은 배치된 숫자들 중 가장 큰 것
    const smallerPlaced = placedNumbers.filter(p => p.value <= currentNumber);
    // 현재 숫자보다 큰 배치된 숫자들 중 가장 작은 것
    const largerPlaced = placedNumbers.filter(p => p.value >= currentNumber);

    if (smallerPlaced.length > 0) {
      const nearest = smallerPlaced[smallerPlaced.length - 1];
      // 이 숫자와 현재 숫자 사이에 들어올 수 있는 남은 숫자 개수
      const numbersBetween = numericRemaining.filter(
        n => n > nearest.value && n < currentNumber
      ).length;
      // 같은 숫자(11-19)가 남아있다면 추가
      const sameNumberRemaining = numericRemaining.filter(n => n === currentNumber).length;
      const totalNeeded = numbersBetween + (currentNumber >= 11 && currentNumber <= 19 ? sameNumberRemaining : 0);

      if (totalNeeded > 0) {
        gapAnalysis += `\n⚠️ 주의: ${nearest.pos}번 칸의 ${nearest.value}와 현재 숫자 ${currentNumber} 사이에 배치 가능한 남은 숫자가 ${totalNeeded}개 있습니다!`;
        gapAnalysis += `\n   → ${nearest.value}와 ${currentNumber} 사이 숫자들: ${numericRemaining.filter(n => n > nearest.value && n <= currentNumber).join(', ')}`;
        gapAnalysis += `\n   → 따라서 ${nearest.pos}번 칸 바로 옆이 아닌, 최소 ${totalNeeded + 1}칸 이상 떨어진 위치에 배치해야 합니다!`;
      }
    }

    if (largerPlaced.length > 0) {
      const nearest = largerPlaced[0];
      const numbersBetween = numericRemaining.filter(
        n => n > currentNumber && n < nearest.value
      ).length;
      const sameNumberRemaining = numericRemaining.filter(n => n === currentNumber).length;
      const totalNeeded = numbersBetween + (currentNumber >= 11 && currentNumber <= 19 ? sameNumberRemaining : 0);

      if (totalNeeded > 0) {
        gapAnalysis += `\n⚠️ 주의: 현재 숫자 ${currentNumber}와 ${nearest.pos}번 칸의 ${nearest.value} 사이에 배치 가능한 남은 숫자가 ${totalNeeded}개 있습니다!`;
        gapAnalysis += `\n   → ${currentNumber}와 ${nearest.value} 사이 숫자들: ${numericRemaining.filter(n => n >= currentNumber && n < nearest.value).join(', ')}`;
        gapAnalysis += `\n   → 따라서 ${nearest.pos}번 칸 바로 옆이 아닌, 최소 ${totalNeeded + 1}칸 이상 떨어진 위치에 배치해야 합니다!`;
      }
    }
  }

  // 남은 숫자 상세 정보
  const remainingInfo = numericRemaining.sort((a, b) => a - b).join(', ');
  const jokerRemaining = remainingNumbers.filter(n => n === "★").length;

  const prompt = `당신은 "스트림스" 보드게임의 최고 전문가 AI입니다. **확률 기반 간격 분석**으로 최적의 배치를 결정하세요.

## ★★★ 가장 중요한 원칙: 간격 분석 (Gap Analysis) ★★★
**배치된 숫자와 현재 숫자 사이에 들어올 수 있는 남은 숫자 개수만큼 빈칸을 확보해야 합니다!**

예시: 5번 칸에 5가 있고, 현재 숫자 11을 배치할 때
- 5와 11 사이에 올 수 있는 숫자: 6, 7, 8, 9, 10, (11 한장 더) = 최대 6개
- 따라서 5번 칸 바로 옆(6번 칸)이 아닌, 최소 6~7칸 이상 떨어진 위치(11번~12번 칸)에 배치해야 함
- 6번 칸에 11을 놓으면 중간 숫자들이 들어갈 공간이 없어 연속이 끊김!

## 현재 간격 분석 결과
${gapAnalysis || "현재 배치된 숫자가 없거나 간격 문제가 없습니다."}

## 남은 숫자 현황
- 남은 숫자들: ${remainingInfo || "없음"}${jokerRemaining > 0 ? `, 조커 ${jokerRemaining}개` : ""}
- 현재 숫자(${currentNumber})보다 작은 숫자: ${lessCount}개
- 현재 숫자(${currentNumber})보다 큰 숫자: ${moreCount}개

## 절대 금지 사항
- 인접한 숫자보다 작은 숫자를 그 뒤에 배치 금지
- 모든 배치는 엄격한 오름차순(≤) 유지 (같은 숫자는 허용)
- **간격 분석을 무시한 인접 배치 절대 금지!**

## 적응형 목표 전략
- **1차 목표**: 16칸 연속 오름차순 (72점)
- **2차 목표**: 15칸 연속 오름차순 (62점)
- **3차 목표**: 14칸 연속 오름차순 (53점)

## 구역 정의
- **메인 존**: 3번~18번 칸 (총 16칸)
- **버림 존**: 1,2번 칸 + 19,20번 칸

## 앵커 배치
- 숫자 1 → 3번 칸
- 숫자 30 → 18번 칸

## 확률 기반 권장 위치
- 현재 숫자: ${currentNumber}
- 비율: ${(ratio * 100).toFixed(1)}% (작은 숫자 비율)
- **기본 권장 위치: ${suggestedIndex}번 칸**
- 단, 간격 분석 결과에 따라 조정 필요!

## 같은 숫자(11~19) 처리
- 같은 숫자도 연속 오름차순으로 인정 (예: 11, 11, 12 = 3칸 연속)
- **두 번째 같은 숫자**: 첫 번째와 인접 배치 권장 (단, 다른 숫자가 사이에 없을 때만!)

## 조커(★) 전략
- 조커는 어떤 숫자와도 오름차순 만족
- 끊어진 연결을 이어줄 수 있는 위치에 배치

## 현재 보드 상태
- 턴: ${turn}/20
- 현재 배치할 숫자: ${currentNumber}
- 보드: ${boardVisualization}
- 메인 존 빈칸: ${mainZoneEmpty.join(", ") || "없음"}
- 메인 존 채워진 칸: ${mainZoneFilled.map(f => `${f.pos}번=${f.value}`).join(", ") || "없음"}
- 모든 빈칸: ${emptySlots.join(", ")}

## 의사결정 우선순위
1. **간격 분석 최우선**: 배치된 숫자와 현재 숫자 사이에 들어올 남은 숫자 개수 확인
2. 숫자 1이면 → 3번 칸
3. 숫자 30이면 → 18번 칸
4. 11~19 두 번째 숫자: 첫 번째와 인접 (단, 사이에 올 숫자가 없을 때만!)
5. 조커(★) → 연결 효과 최대화 위치
6. 그 외: 권장 위치 기준으로 간격을 충분히 확보한 위치에 배치

**중요**: 배치 시 왼쪽 숫자와의 간격, 오른쪽 숫자와의 간격 모두 고려하여 남은 숫자들이 들어갈 공간을 확보하세요!

다음 JSON 형식으로만 응답하세요:
{
  "index": <1-20 사이의 칸 번호>,
  "reason": "<간격 분석을 포함한 배치 이유를 한국어로 2-3문장으로 설명>",
  "confidence": <0-100 사이의 신뢰도>,
  "strategy": "<ANCHOR_1 | ANCHOR_30 | GAP_ANALYSIS | PROBABILITY_MAIN | ADJACENT_SAME | JOKER_BRIDGE | BUFFER_DISCARD>"
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
