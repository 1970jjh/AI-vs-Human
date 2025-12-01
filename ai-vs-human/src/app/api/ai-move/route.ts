import { NextRequest, NextResponse } from "next/server";
import { getAIBestMove } from "@/lib/gemini";

// POST /api/ai-move
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { board, number, remainingNumbers } = body;

    if (!board || number === undefined || !remainingNumbers) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await getAIBestMove(board, number, remainingNumbers);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("AI Move API error:", error);
    return NextResponse.json(
      { success: false, error: "AI 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
