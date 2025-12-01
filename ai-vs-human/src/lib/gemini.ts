/**
 * Google Gemini API 연동
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  findAdjacentPosition,
  checkMainZoneStrictAscending,
  validateAscendingPlacement,
  analyze72Strategy,
} from "./ai-logic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const systemPrompt = `당신은 보드게임 '스트림스'의 AI 전문가 '포트리스-72(Fortress-72)'입니다. 당신의 유일한 목표는 정확히 72점을 획득하는 것입니다.

## *** 최우선 지침 ***
3번째칸과 18번째 칸을 연속해서 오름차순으로 이어갈 수 없는 숫자는 이미 사전에 필터링되어 수동 배치로 전환됩니다. 따라서 당신에게 전달되는 모든 숫자는 메인 존에서 연속 오름차순이 가능한 숫자입니다.

## *** 절대 금지 사항 ***
- 어떤 경우에도 인접한 숫자보다 작은 숫자를 그 뒤에 배치하면 안 됩니다
- 예: 8이 있는 위치 다음에 7을 배치하는 것은 절대 금지
- 모든 배치는 엄격한 오름차순(≤)을 유지해야 합니다

## *** 조커(★) 업데이트 처리 ***
- 조커는 숫자로 변환하지 않고 '★' 그대로 배치합니다
- 조커는 어떤 숫자와도 오름차순을 만족시킬 수 있습니다
- 조커를 활용해 끊어진 연결을 이어주는 위치에 배치하세요

## 72점 요새 전략
목표: 정확히 72점 = 70점(메인 스트림) + 1점(헤드 버퍼) + 1점(테일 버퍼)

### 구역 정의
- 메인 존 (Main Zone): 인덱스 2~17 (3번째~18번째 칸, 총 16칸)
- 헤드 버퍼 (Head Buffer): 인덱스 0~1 (1번째~2번째 칸, 총 2칸)
- 테일 버퍼 (Tail Buffer): 인덱스 18~19 (19번째~20번째 칸, 총 2칸)

### 핵심 배치 원칙

#### 1. 앵커 배치 (절대 우선순위)
- 숫자 1: 반드시 인덱스 2(3번째 칸)에 배치
- 숫자 30: 반드시 인덱스 17(18번째 칸)에 배치

#### 2. 메인 존 확률적 배치 (1과 30 사이 숫자들)
배치 공식:
1. 남은 숫자 목록에서 현재 숫자보다 작은 숫자 개수 = less_count
2. 남은 숫자 목록에서 현재 숫자보다 큰 숫자 개수 = more_count
3. 비율 계산: ratio = less_count / (less_count + more_count)
4. 목표 인덱스: target_index = 2 + floor(15 * ratio)
5. target_index에 가장 가까운 메인 존 내에서 **오름차순을 유지할 수 있는** 빈칸에 배치

## 출력 형식
반드시 다음 JSON 형식으로만 응답:
{"index": [0-19 사이의 숫자], "number": [배치될 숫자]}

조커의 경우 number 필드에 '★'를 그대로 입력하세요.`;

export interface AIResponse {
  index: number;
  number: number | "★" | "MANUAL_MODE";
  reason?: string;
}

export async function getAIBestMove(
  board: (number | "★" | null)[],
  number: number | "★",
  remainingNumbers: (number | "★")[]
): Promise<AIResponse> {
  console.log("=== AI 배치 시작 ===");
  console.log(`현재 보드: ${JSON.stringify(board)}`);
  console.log(`배치할 숫자: ${number}`);

  // 같은 숫자 두 번째 등장 처리
  if (number !== "★" && number !== 1 && number !== 30) {
    const existingIndex = board.indexOf(number);
    if (existingIndex !== -1) {
      console.log(`같은 숫자 ${number} 발견됨 (위치: ${existingIndex})`);
      const adjacentPosition = findAdjacentPosition(board, existingIndex, number);
      if (adjacentPosition !== -1) {
        console.log(`인근 위치 ${adjacentPosition}에 배치`);
        return {
          index: adjacentPosition,
          number: number,
          reason: `같은 숫자 ${number}의 인근 위치에 배치`,
        };
      }
    }
  }

  // 최우선 지침 검사
  if (number === 1) {
    console.log("앵커 숫자 1: 3번째 칸에 배치");
    if (board[2] === null) {
      return { index: 2, number: 1 };
    }
  } else if (number === 30) {
    console.log("앵커 숫자 30: 18번째 칸에 배치");
    if (board[17] === null) {
      return { index: 17, number: 30 };
    }
  } else if (number === "★") {
    console.log("조커: AI 처리");
  } else {
    // 일반 숫자: 메인 존에서 연속 오름차순 가능 여부 검사
    const canPlaceInMainZone = checkMainZoneStrictAscending(board, number);

    if (!canPlaceInMainZone) {
      console.log(`숫자 ${number}는 메인 존에서 연속 오름차순 불가능`);
      return {
        index: -1,
        number: "MANUAL_MODE",
        reason: `숫자 ${number}는 3~18번째 칸에서 연속 오름차순을 만들 수 없습니다.`,
      };
    }
  }

  // Gemini API 호출
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const analysis = analyze72Strategy(board, number, remainingNumbers);
    const boardState = board.map((cell) => (cell === null ? null : cell));
    const remainingTurns = board.filter((x) => x === null).length;

    const userPrompt = JSON.stringify({
      current_board: boardState,
      number_to_place: number,
      remaining_turns: remainingTurns,
      remaining_numbers_pool: remainingNumbers,
      strategy_analysis: analysis,
    });

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt },
    ]);

    const response = result.response;
    const text = response.text();

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON 응답을 찾을 수 없습니다.");
    }

    const bestMoveData = JSON.parse(jsonMatch[0]) as AIResponse;
    console.log(`AI 응답: ${JSON.stringify(bestMoveData)}`);

    // 2차 검증
    if (
      bestMoveData.index >= 2 &&
      bestMoveData.index <= 17 &&
      number !== "★"
    ) {
      if (
        !validateAscendingPlacement(board, bestMoveData.index, bestMoveData.number as number)
      ) {
        console.log("AI가 제안한 배치가 오름차순 위반");
        return {
          index: -1,
          number: "MANUAL_MODE",
          reason: "AI가 제안한 위치에서 오름차순이 위반됩니다.",
        };
      }
    }

    // 응답 검증
    if (bestMoveData.index === -1 && bestMoveData.number === "MANUAL_MODE") {
      return bestMoveData;
    }

    if (
      typeof bestMoveData.index !== "number" ||
      bestMoveData.index < 0 ||
      bestMoveData.index >= 20
    ) {
      throw new Error("AI가 잘못된 형식의 응답을 반환했습니다.");
    }

    console.log(`AI 배치 확정: 위치 ${bestMoveData.index}`);
    return bestMoveData;
  } catch (error) {
    console.error("Gemini API 오류:", error);

    // 폴백: 간단한 로직으로 배치
    return getFallbackMove(board, number, remainingNumbers);
  }
}

// 폴백 배치 로직
function getFallbackMove(
  board: (number | "★" | null)[],
  number: number | "★",
  remainingNumbers: (number | "★")[]
): AIResponse {
  console.log("폴백 로직 사용");

  // 앵커 숫자 처리
  if (number === 1 && board[2] === null) {
    return { index: 2, number: 1 };
  }
  if (number === 30 && board[17] === null) {
    return { index: 17, number: 30 };
  }

  // 조커 처리 - 가운데 빈칸에 배치
  if (number === "★") {
    for (let i = 9; i >= 2; i--) {
      if (board[i] === null) {
        return { index: i, number: "★" };
      }
    }
    for (let i = 10; i <= 17; i++) {
      if (board[i] === null) {
        return { index: i, number: "★" };
      }
    }
  }

  // 확률적 배치
  if (typeof number === "number") {
    const numericRemaining = remainingNumbers.filter(
      (n): n is number => n !== "★" && typeof n === "number"
    );
    const lessThanCurrent = numericRemaining.filter((n) => n < number).length;
    const moreThanCurrent = numericRemaining.filter((n) => n > number).length;
    const total = lessThanCurrent + moreThanCurrent;
    const ratio = total > 0 ? lessThanCurrent / total : 0.5;
    const targetIndex = 2 + Math.floor(15 * ratio);

    // target 주변에서 유효한 빈칸 찾기
    for (let offset = 0; offset <= 15; offset++) {
      for (const dir of [0, 1, -1]) {
        const idx = targetIndex + offset * dir;
        if (idx >= 2 && idx <= 17 && board[idx] === null) {
          if (validateAscendingPlacement(board, idx, number)) {
            return { index: idx, number };
          }
        }
      }
    }
  }

  // 버퍼 영역에 배치
  for (const idx of [0, 1, 18, 19]) {
    if (board[idx] === null) {
      return { index: idx, number };
    }
  }

  // 아무 빈칸에나 배치
  for (let i = 0; i < 20; i++) {
    if (board[i] === null) {
      return { index: i, number };
    }
  }

  return { index: -1, number: "MANUAL_MODE", reason: "배치할 위치가 없습니다." };
}
