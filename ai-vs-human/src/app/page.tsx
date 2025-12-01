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

  // 숫자 선택 처리
  const handleSelectNumber = useCallback(
    (num: number | "★") => {
      if (turn >= BOARD_SIZE || isProcessing) return;

      setIsProcessing(true);
      setCurrentNumber(num);

      // AI 최적 위치 계산
      const remaining = getRemainingNumbers().filter((n) => n !== num);
      const decision = findOptimalPosition(aiBoard, num, remaining);

      // 약간의 딜레이 후 배치 (시각적 효과)
      setTimeout(() => {
        if (decision.index !== -1) {
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
              timestamp: Date.now(),
            },
            ...prev,
          ]);
        }

        setUsedNumbers((prev) => [...prev, num]);
        setTurn((prev) => prev + 1);
        setCurrentNumber(null);
        setIsProcessing(false);
      }, 500);
    },
    [aiBoard, turn, isProcessing, getRemainingNumbers]
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
            <p className="text-sm text-muted">72점 요새 전략 AI</p>
          </div>
          <div className="flex items-center gap-4">
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
                <div className="mb-4 p-4 bg-accent/20 border border-accent/50 rounded-xl text-center">
                  <span className="text-2xl font-bold text-accent">
                    게임 완료! 최종 점수: {aiScore}점
                  </span>
                </div>
              )}

              {isProcessing && currentNumber !== null && (
                <div className="mb-4 p-4 bg-primary/20 border border-primary/50 rounded-xl text-center animate-pulse">
                  <span className="text-primary font-bold">
                    AI가 숫자 {currentNumber}의 최적 위치를 계산 중...
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
