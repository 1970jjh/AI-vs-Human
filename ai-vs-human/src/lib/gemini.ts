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

  const prompt = `당신은 "스트림스" 보드게임의 최고 전문가 AI입니다. **안정적이고 보수적인 플레이**를 통해 높은 점수를 획득하세요.

## *** 절대 금지 사항 ***
- 어떤 경우에도 인접한 숫자보다 작은 숫자를 그 뒤에 배치하면 안 됩니다
- 예: 8번 칸에 15가 있으면, 9번 칸 이후에는 15 이상의 숫자만 배치 가능
- 모든 배치는 엄격한 오름차순(≤)을 유지해야 합니다 (같은 숫자는 허용)

## 적응형 목표 전략 (매우 중요!)
- **1차 목표**: 16칸 연속 오름차순 (72점) - 이상적인 최고점
- **2차 목표**: 15칸 연속 오름차순 (62점) - 안정적인 고득점
- **3차 목표**: 14칸 연속 오름차순 (53점) - 현실적인 목표

### 목표 조정 기준
- 게임 초반(1~7턴): 16칸 목표 유지
- 게임 중반(8~14턴): 보드 상태를 분석하여 16칸이 어려워 보이면 15칸으로 조정
- 게임 후반(15~20턴): 현재 연속 구간을 최대한 보존하는 것이 우선

## 구역 정의
- **메인 존**: 3번~18번 칸 (총 16칸) - 여기서 최대 연속 오름차순을 만들어야 함
- **버림 존**: 1,2번 칸 (헤드 버퍼) + 19,20번 칸 (테일 버퍼) - 메인 존에 못 넣는 숫자 버리는 곳

## 앵커 배치 (절대 우선순위)
- 숫자 1: 반드시 3번 칸에 배치 (메인 존 시작)
- 숫자 30: 반드시 18번 칸에 배치 (메인 존 끝)

## 보수적 배치 공식 (1, 30 외의 숫자)
현재 숫자 ${currentNumber}에 대한 계산 결과:
- 남은 숫자 중 ${currentNumber}보다 작은 개수: ${lessCount}개
- 남은 숫자 중 ${currentNumber}보다 큰 개수: ${moreCount}개
- 비율: ${(ratio * 100).toFixed(1)}%
- **권장 위치: ${suggestedIndex}번 칸** (4~17번 범위의 보수적 배치)

### 보수적 배치 원칙
- 중간값 숫자(11~20)는 **권장 위치보다 1~2칸 앞쪽(왼쪽)**에 배치하여 오른쪽 여유 공간 확보
- 예: 숫자 19의 권장 위치가 15번이면 → 13번 또는 14번 칸에 배치 권장
- 이유: 오른쪽에 더 큰 숫자들이 들어올 공간을 남겨두어 연속 구간 단절 방지

## 조커(★) 전략
- 조커는 '★' 그대로 배치 (숫자로 변환하지 않음)
- 조커는 어떤 숫자와도 오름차순을 만족
- 끊어진 연결을 이어줄 수 있는 위치에 배치

## 같은 숫자 처리 (매우 중요!)
- 같은 숫자도 연속 오름차순으로 인정됩니다 (예: 11, 11, 12 = 3칸 연속)
- **11~19 숫자가 두 번째로 나오면**: 이미 배치된 같은 숫자의 바로 앞 또는 바로 뒤에 인접 배치해야 합니다!
- 앞 칸과 뒤 칸 중 어느 쪽에 배치하면 더 긴 연속 오름차순을 만들 수 있는지 판단하세요

## 현재 보드 상태
- 턴: ${turn}/20
- 현재 배치할 숫자: ${currentNumber}
- 보드: ${boardVisualization}
- 메인 존(3~18번) 빈칸: ${mainZoneEmpty.join(", ") || "없음"}
- 메인 존 채워진 칸: ${mainZoneFilled.map(f => `${f.pos}번=${f.value}`).join(", ") || "없음"}
- 모든 빈칸: ${emptySlots.join(", ")}

## 의사결정 알고리즘
1. 숫자가 1이면 → 3번 칸
2. 숫자가 30이면 → 18번 칸
3. 11~19 숫자가 이미 보드에 있으면 → 인접 배치 우선
4. 조커(★)면 → 가장 효과적인 연결 위치
5. 그 외: 권장 위치(${suggestedIndex}번) 또는 **1~2칸 앞쪽** 빈칸에 배치
   - 반드시 오름차순 유지 (왼쪽 숫자 ≤ 현재 ≤ 오른쪽 숫자)
   - 오른쪽 여유 공간을 확보하는 보수적 선택 권장

다음 JSON 형식으로만 응답하세요:
{
  "index": <1-20 사이의 칸 번호>,
  "reason": "<배치 이유를 한국어로 2-3문장으로 설명>",
  "confidence": <0-100 사이의 신뢰도>,
  "strategy": "<ANCHOR_1 | ANCHOR_30 | PROBABILITY_MAIN | ADJACENT_SAME | JOKER_BRIDGE | BUFFER_DISCARD | ADAPTIVE_GOAL>"
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
