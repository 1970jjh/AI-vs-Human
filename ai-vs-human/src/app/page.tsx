"use client";

import { useState, useCallback } from "react";
import GameBoard from "@/components/GameBoard";
import ScoreTable from "@/components/ScoreTable";
import NumberPanel from "@/components/NumberPanel";
import AIDecisionPanel from "@/components/AIDecisionPanel";
import { BOARD_SIZE } from "@/lib/types";
import {
  calculateScore,
  createDeck,
  shuffleDeck,
  findOptimalPosition,
} from "@/lib/ai-logic";

interface AIDecision {
  number: number | "★";
  index: number;
  reason: string;
  confidence: number;
  timestamp: number;
  strategy?: string;
}

export default function Home() {
  // 게임 상태
  const [aiBoard, setAiBoard] = useState<(number | "★" | null)[]>(
    Array(BOARD_SIZE).fill(null)
  );
  const [aiScore, setAiScore] = useState(0);
  const [usedNumbers, setUsedNumbers] = useState<(number | "★")[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | "★" | null>(null);
  const [turn, setTurn] = useState(0);
  const [lastPlacedIndex, setLastPlacedIndex] = useState<number | null>(null);
  const [aiDecisions, setAiDecisions] = useState<AIDecision[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useGemini, setUseGemini] = useState(true);

  // 남은 숫자 계산
  const getRemainingNumbers = useCallback(() => {
    const deck = createDeck();
    const remaining: (number | "★")[] = [];

    for (const num of deck) {
      const usedCount = usedNumbers.filter((n) => n === num).length;
      const deckCount = deck.filter((n) => n === num).length;
      const remainingCount = deckCount - usedCount;

      for (let i = 0; i < remainingCount; i++) {
        const isDoubleCard = typeof num === "number" && num >= 11 && num <= 19;
        if (!remaining.includes(num) || isDoubleCard) {
          remaining.push(num);
        }
      }
    }

    return remaining;
  }, [usedNumbers]);

  // Gemini API 호출
  const callGeminiAPI = async (
    board: (number | "★" | null)[],
    num: number | "★",
    remaining: (number | "★")[],
    currentTurn: number
  ) => {
    try {
      const response = await fetch("/api/ai-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board,
          currentNumber: num,
          usedNumbers,
          remainingNumbers: remaining,
          turn: currentTurn,
        }),
      });

      const data = await response.json();
      if (data.success && data.decision) {
        return data.decision;
      }
      return null;
    } catch (error) {
      console.error("Gemini API error:", error);
      return null;
    }
  };

  // 숫자 선택 처리
  const handleSelectNumber = useCallback(
    async (num: number | "★") => {
      if (turn >= BOARD_SIZE || isProcessing) return;

      setIsProcessing(true);
      setCurrentNumber(num);

      const remaining = getRemainingNumbers().filter((n) => n !== num);
      let decision;

      if (useGemini) {
        // Gemini API 사용
        decision = await callGeminiAPI(aiBoard, num, remaining, turn + 1);
      }

      // Gemini 실패 시 또는 비활성화 시 로컬 로직 사용
      if (!decision) {
        decision = findOptimalPosition(aiBoard, num, remaining);
      }

      if (decision && decision.index !== -1 && decision.index < BOARD_SIZE && aiBoard[decision.index] === null) {
        const newBoard = [...aiBoard];
        newBoard[decision.index] = num;
        setAiBoard(newBoard);
        setAiScore(calculateScore(newBoard));
        setLastPlacedIndex(decision.index);

        // AI 결정 기록
        setAiDecisions((prev) => [
          {
            number: num,
            index: decision.index,
            reason: decision.reason,
            confidence: decision.confidence,
            strategy: decision.strategy,
            timestamp: Date.now(),
          },
          ...prev,
        ]);
      }

      setUsedNumbers((prev) => [...prev, num]);
      setTurn((prev) => prev + 1);
      setCurrentNumber(null);
      setIsProcessing(false);
    },
    [aiBoard, turn, isProcessing, getRemainingNumbers, useGemini, usedNumbers]
  );

  // 랜덤 선택
  const handleRandomSelect = useCallback(() => {
    if (turn >= BOARD_SIZE || isProcessing) return;

    const remaining = getRemainingNumbers();
    if (remaining.length === 0) return;

    const shuffled = shuffleDeck(remaining);
    handleSelectNumber(shuffled[0]);
  }, [turn, isProcessing, getRemainingNumbers, handleSelectNumber]);

  // 게임 리셋
  const handleReset = () => {
    setAiBoard(Array(BOARD_SIZE).fill(null));
    setAiScore(0);
    setUsedNumbers([]);
    setCurrentNumber(null);
    setTurn(0);
    setLastPlacedIndex(null);
    setAiDecisions([]);
    setIsProcessing(false);
  };

  const isGameFinished = turn >= BOARD_SIZE;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 헤더 */}
      <header className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">AI vs Human</h1>
            <p className="text-sm text-muted">
              {useGemini ? "Gemini 2.0 Flash AI" : "로컬 72점 요새 전략"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* AI 모드 토글 */}
            <button
              onClick={() => setUseGemini(!useGemini)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                useGemini
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                  : "bg-muted/20 text-muted border border-muted/50"
              }`}
            >
              {useGemini ? "Gemini ON" : "Gemini OFF"}
            </button>

            <div className="text-center">
              <div className="text-xs text-muted">라운드</div>
              <div className="text-xl font-bold">
                {turn}/{BOARD_SIZE}
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              리셋
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-6">
            {/* 왼쪽: 숫자 선택 패널 */}
            <div className="col-span-3">
              <NumberPanel
                usedNumbers={usedNumbers}
                currentNumber={currentNumber}
                onSelectNumber={handleSelectNumber}
                onRandomSelect={handleRandomSelect}
                isAdmin={true}
                disabled={isGameFinished || isProcessing}
              />
            </div>

            {/* 중앙: AI 게임 보드 */}
            <div className="col-span-5">
              {isGameFinished && (
                <div className={`mb-4 p-4 rounded-xl text-center border ${
                  aiScore >= 72
                    ? "bg-accent/20 border-accent/50"
                    : "bg-yellow-500/20 border-yellow-500/50"
                }`}>
                  <span className={`text-2xl font-bold ${
                    aiScore >= 72 ? "text-accent" : "text-yellow-400"
                  }`}>
                    게임 완료! 최종 점수: {aiScore}점
                    {aiScore >= 72 && " (목표 달성!)"}
                  </span>
                </div>
              )}

              {isProcessing && currentNumber !== null && (
                <div className="mb-4 p-4 bg-primary/20 border border-primary/50 rounded-xl text-center animate-pulse">
                  <span className="text-primary font-bold">
                    {useGemini ? "Gemini AI가" : "AI가"} 숫자 {currentNumber}의 최적 위치를 분석 중...
                  </span>
                </div>
              )}

              <GameBoard
                board={aiBoard}
                teamName="AI"
                score={aiScore}
                highlightIndex={lastPlacedIndex ?? undefined}
                isManualMode={false}
                showPlacementMarker={true}
                showScoreMarker={true}
              />
            </div>

            {/* 오른쪽: AI 결정 패널 + 점수표 */}
            <div className="col-span-4 space-y-4">
              <AIDecisionPanel
                decisions={aiDecisions}
                currentScore={aiScore}
              />
              <ScoreTable />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
