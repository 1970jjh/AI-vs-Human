import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-pro-preview-06-05",
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

  const prompt = `당신은 "스트림스" 보드게임의 최고 전문가 AI입니다.

## 게임 규칙
- 20칸 보드에 숫자를 배치합니다
- 목표: 연속된 오름차순 숫자 구간을 최대한 길게 만들기
- 점수표: 1칸=0, 2칸=1, 3칸=3, 4칸=5, 5칸=7, 6칸=9, 7칸=11, 8칸=15, 9칸=20, 10칸=25, 11칸=30, 12칸=35, 13칸=40, 14칸=50, 15칸=60, 16칸=70, 17칸=85, 18칸=100, 19칸=150, 20칸=300
- 72점(16칸 연속) 이상이 목표입니다
- 조커(★)는 어떤 숫자로든 취급될 수 있습니다

## 카드 구성
- 1~10: 각 1장
- 11~19: 각 2장
- 20~30: 각 1장
- 조커(★): 1장
- 총 30장 중 20장을 사용

## 72점 요새 전략
- 메인 존(3~18번 칸): 여기에 16개의 연속 오름차순을 만들어야 72점
- 버림 존(1,2번, 19,20번 칸): 메인 존에 넣기 어려운 숫자를 버리는 곳
- 앵커: 1은 가능하면 왼쪽 끝, 30은 오른쪽 끝에 배치
- 확률적 배치: 남은 숫자 중 현재 숫자보다 작은 것과 큰 것의 비율로 위치 결정

## 현재 상황
- 턴: ${turn}/20
- 현재 배치할 숫자: ${currentNumber}
- 보드 상태: ${boardVisualization}
- 빈 칸 번호: ${emptySlots.join(", ")}
- 사용된 숫자: ${usedNumbers.join(", ") || "없음"}
- 남은 숫자(추정): ${remainingNumbers.join(", ")}

## 분석 요청
현재 숫자 "${currentNumber}"를 배치할 최적의 위치를 결정해주세요.

다음 JSON 형식으로만 응답하세요:
{
  "index": <1-20 사이의 칸 번호>,
  "reason": "<배치 이유를 한국어로 2-3문장으로 설명>",
  "confidence": <0-100 사이의 신뢰도>,
  "strategy": "<사용한 전략 이름>"
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
