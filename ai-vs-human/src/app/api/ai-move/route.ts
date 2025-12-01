import { NextRequest, NextResponse } from "next/server";
import { getAIDecision, AIAnalysisRequest } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body: AIAnalysisRequest = await request.json();

    const { board, currentNumber, usedNumbers, remainingNumbers, turn } = body;

    // 유효성 검사
    if (!board || currentNumber === undefined || currentNumber === null) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Gemini API 호출
    const decision = await getAIDecision({
      board,
      currentNumber,
      usedNumbers: usedNumbers || [],
      remainingNumbers: remainingNumbers || [],
      turn: turn || 1,
    });

    // 유효한 인덱스인지 확인
    if (decision.index < 0 || decision.index >= 20 || board[decision.index] !== null) {
      // 유효하지 않으면 첫 번째 빈 칸으로 폴백
      const fallbackIndex = board.findIndex((cell) => cell === null);
      return NextResponse.json({
        success: true,
        decision: {
          index: fallbackIndex,
          reason: "AI가 선택한 위치가 유효하지 않아 대체 위치에 배치합니다.",
          confidence: 20,
          strategy: "FALLBACK",
        },
      });
    }

    return NextResponse.json({
      success: true,
      decision,
    });
  } catch (error) {
    console.error("AI move error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get AI decision" },
      { status: 500 }
    );
  }
}
