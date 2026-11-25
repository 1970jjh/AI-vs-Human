"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameBoard from "@/components/GameBoard";
import ScoreTable from "@/components/ScoreTable";
import NumberPanel from "@/components/NumberPanel";
import AIDecisionPanel from "@/components/AIDecisionPanel";
import { BOARD_SIZE } from "@/lib/types";
import {
  calculateScore,
  createDeck,
  shuffleDeck,
} from "@/lib/ai-logic";
import { engineDecision, slotOutlook, Outlook } from "@/lib/engine";
import { playScoreSound, playFanfareSound } from "@/lib/sounds";

interface AIDecision {
  number: number | "★";
  index: number;
  reason: string;
  confidence: number;
  timestamp: number;
  strategy?: string;
  outlook?: Outlook;
}

const ADMIN_PASSWORD = "6749467";

// 게임용 40장 덱 생성 (전체 40장을 셔플)
function createGameDeck(): (number | "★")[] {
  const fullDeck = createDeck(); // 40장
  return shuffleDeck(fullDeck); // 전체 셔플
}

export default function Home() {
  // 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // 테마 상태
  const [isDarkMode, setIsDarkMode] = useState(true);

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
  const [useGemini, setUseGemini] = useState(false); // 기본: 무료 시뮬레이션 엔진
  const prevScoreRef = useRef(0);
  const hasPlayedFanfareRef = useRef(false);

  // 덮개 시스템 상태 (40개 카드)
  const [shuffledDeck, setShuffledDeck] = useState<(number | "★")[]>([]);
  const [revealedCovers, setRevealedCovers] = useState<boolean[]>(Array(40).fill(false));

  // 초기 덱 생성 (컴포넌트 마운트 시)
  useEffect(() => {
    if (shuffledDeck.length === 0) {
      setShuffledDeck(createGameDeck());
    }
  }, [shuffledDeck.length]);

  // 점수 변경 시 효과음 재생
  useEffect(() => {
    if (aiScore > prevScoreRef.current && prevScoreRef.current >= 0) {
      playScoreSound();
    }
    prevScoreRef.current = aiScore;
  }, [aiScore]);

  // 게임 완료 시 빵빠레 효과음
  useEffect(() => {
    if (turn >= BOARD_SIZE && !hasPlayedFanfareRef.current) {
      hasPlayedFanfareRef.current = true;
      // 약간의 딜레이 후 빵빠레 재생
      setTimeout(() => {
        playFanfareSound();
      }, 300);
    }
  }, [turn]);

  // 테마 적용
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [isDarkMode]);

  // 남은 숫자 계산 (아직 공개되지 않은 덮개의 숫자들)
  const getRemainingNumbers = useCallback(() => {
    const remaining: (number | "★")[] = [];

    for (let i = 0; i < shuffledDeck.length; i++) {
      if (!revealedCovers[i]) {
        remaining.push(shuffledDeck[i]);
      }
    }

    return remaining;
  }, [shuffledDeck, revealedCovers]);

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

      // 아직 안 나온 카드: 공개 전 덮개 카드에서 방금 뽑힌 카드 "한 장만" 뺀다
      // (11~19는 2장씩이라 filter 로 전부 빼면 남은 한 장까지 사라진다)
      const remaining = [...getRemainingNumbers()];
      const selfIdx = remaining.indexOf(num);
      if (selfIdx !== -1) remaining.splice(selfIdx, 1);
      const drawsLeft = BOARD_SIZE - turn - 1;
      let decision;

      if (useGemini) {
        decision = await callGeminiAPI(aiBoard, num, remaining, turn + 1);
      }

      // Gemini OFF 이거나 실패하면: 시뮬레이션 엔진(무료, 브라우저에서 계산)
      if (!decision || decision.strategy === "FALLBACK") {
        // 화면이 "분석 중"을 먼저 그리도록 한 틱 양보
        await new Promise((r) => setTimeout(r, 30));
        decision = engineDecision(aiBoard, num, remaining, drawsLeft);
      }

      if (decision && decision.index !== -1 && decision.index < BOARD_SIZE && aiBoard[decision.index] === null) {
        const newBoard = [...aiBoard];
        newBoard[decision.index] = num;
        setAiBoard(newBoard);
        setAiScore(calculateScore(newBoard));
        setLastPlacedIndex(decision.index);

        setAiDecisions((prev) => [
          {
            number: num,
            index: decision.index,
            reason: decision.reason,
            confidence: decision.confidence,
            strategy: decision.strategy,
            outlook: slotOutlook(aiBoard, num, remaining, drawsLeft, decision.index),
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

  // 덮개 공개 핸들러
  const handleRevealCover = useCallback(
    (index: number) => {
      if (turn >= BOARD_SIZE || isProcessing) return;
      if (revealedCovers[index]) return;

      // 덮개 공개
      const newRevealedCovers = [...revealedCovers];
      newRevealedCovers[index] = true;
      setRevealedCovers(newRevealedCovers);

      // 해당 숫자로 게임 진행
      const num = shuffledDeck[index];
      if (num !== undefined) {
        handleSelectNumber(num);
      }
    },
    [turn, isProcessing, revealedCovers, shuffledDeck, handleSelectNumber]
  );

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
    prevScoreRef.current = 0;
    hasPlayedFanfareRef.current = false;
    // 덮개 시스템 리셋
    setShuffledDeck(createGameDeck());
    setRevealedCovers(Array(40).fill(false));
  };

  const isGameFinished = turn >= BOARD_SIZE;

  // 비밀번호 확인
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput("");
    }
  };

  // 로그인 화면
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div className="w-full max-w-md p-8 rounded-2xl border" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
          {/* 로고 */}
          <div className="text-center mb-8">
            <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-purple-500/30 inline-block">
              <h1 className="font-digital text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                AI vs Human
              </h1>
              <p className="font-mono-digital text-sm text-cyan-400/80 mt-1">
                Gemini 4 Hydrogen AI
              </p>
            </div>
            <p className="font-mono-digital text-xs text-muted mt-4">
              JJ CREATIVE EDU with AI
            </p>
          </div>

          {/* 비밀번호 입력 폼 */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-mono-digital text-muted mb-2">
                관리자 비밀번호
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 rounded-lg border font-mono-digital text-center text-lg tracking-widest"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: passwordError ? "#ef4444" : "var(--border)",
                  color: "var(--text)"
                }}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-400 text-sm font-mono-digital mt-2 text-center">
                  비밀번호가 올바르지 않습니다
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-lg font-digital font-bold text-lg bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90 transition-opacity"
            >
              입장하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  const drawn = currentNumber ?? aiDecisions[0]?.number ?? null;
  const placedIndex = isProcessing ? null : aiDecisions[0]?.index ?? null;
  const statusText = isGameFinished
    ? `게임 완료! 최종 ${aiScore}점${aiScore >= 72 ? " (목표 달성!)" : ""}`
    : isProcessing
      ? `${useGemini ? "Gemini AI" : "AI"} 분석 중...`
      : placedIndex !== null
        ? `→ ${placedIndex + 1}번 칸에 배치`
        : "";

  return (
    <div
      className="h-screen p-3 grid gap-3 overflow-hidden"
      style={{ backgroundColor: "var(--background)", gridTemplateColumns: "28fr 72fr" }}
    >
      {/* 왼쪽: 숫자 선택 패널(화면 맨 위부터 끝까지) + 점수표 */}
      <div className="flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <NumberPanel
            usedNumbers={usedNumbers}
            currentNumber={currentNumber}
            disabled={isGameFinished || isProcessing}
            shuffledDeck={shuffledDeck}
            revealedCovers={revealedCovers}
            onRevealCover={handleRevealCover}
          />
        </div>
        <div className="mt-2 flex-shrink-0">
          <ScoreTable />
        </div>
      </div>

      {/* 오른쪽: 상단 바 + (보드 | AI 결정 패널) */}
      <div className="flex flex-col min-h-0">
        <header className="flex-shrink-0 flex items-center gap-4 mb-3">
          {/* 슬로건 */}
          <div className="flex-1 flex justify-center">
            <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/30">
              <span className="font-digital text-2xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI vs Team Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 다크/라이트 모드 토글 */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="px-3 py-1.5 rounded-lg text-sm font-digital font-medium transition-colors border"
              style={{
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                borderColor: "var(--border)",
                color: "var(--text)"
              }}
            >
              {isDarkMode ? "🌙 Dark" : "☀️ Light"}
            </button>

            {/* AI 모드 토글 */}
            <button
              onClick={() => setUseGemini(!useGemini)}
              className={`px-3 py-1.5 rounded-lg text-sm font-digital font-medium transition-colors ${
                useGemini
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                  : "bg-muted/20 text-muted border border-muted/50"
              }`}
            >
              {useGemini ? "Gemini ON" : "Gemini OFF"}
            </button>

            <div className="text-center">
              <div className="text-xs text-muted font-mono-digital">라운드</div>
              <div className="font-digital text-xl font-bold" style={{ color: "var(--text)" }}>
                {turn}/{BOARD_SIZE}
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-digital"
            >
              리셋
            </button>
          </div>
        </header>

        {/* 가운데 컬럼 폭 = 역ㄷ자 보드 폭(높이에서 계산), 남는 폭은 모두 AI 결정 패널로 */}
        <div className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: "min(calc(60vh - 20px), 60%) 1fr" }}>
          {/* 중앙: 역ㄷ자 보드 (가운데 빈 공간에 출제된 숫자) */}
          <div className="min-h-0">
            <GameBoard
              board={aiBoard}
              teamName="AI"
              score={aiScore}
              highlightIndex={lastPlacedIndex ?? undefined}
              isManualMode={false}
              showPlacementMarker={true}
            >
              <div className="font-digital text-muted" style={{ fontSize: "calc(var(--cell) * 0.3)" }}>출제된 숫자</div>
              <div
                className={`font-digital font-black leading-none ${drawn === "★" ? "text-purple-400" : ""} ${isProcessing ? "animate-pulse" : ""}`}
                style={{ fontSize: "calc(var(--cell) * 2.4)", color: drawn === "★" ? undefined : "var(--text-strong)" }}
              >
                {drawn ?? "–"}
              </div>
              <div
                className={`font-digital font-bold mb-6 ${
                  isGameFinished ? (aiScore >= 72 ? "text-accent" : "text-yellow-400") : isProcessing ? "text-primary" : "text-muted"
                }`}
                style={{ fontSize: "calc(var(--cell) * 0.32)", minHeight: "1.3em" }}
              >
                {statusText}
              </div>
            </GameBoard>
          </div>

          {/* 오른쪽: AI 결정 패널 */}
          <div className="flex flex-col min-h-0">
            <AIDecisionPanel
              decisions={aiDecisions}
              currentScore={aiScore}
              title={useGemini ? "Gemini 4 Hydrogen AI vs Human" : "Simulation Engine AI vs Human"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
