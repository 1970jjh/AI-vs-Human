"use client";

import { useMemo } from "react";

interface GameBoardProps {
  board: (number | "★" | null)[];
  teamName: string;
  score: number;
  highlightIndex?: number;
  isManualMode?: boolean;
  onCellClick?: (index: number) => void;
  showPlacementMarker?: boolean;
  showScoreMarker?: boolean;
}

// 보드 레이아웃 (역ㄷ자 형태)
// 1-6: 상단 가로줄
// 7-14: 오른쪽 세로줄 (6번 바로 아래부터)
// 15-20: 하단 가로줄 (20,19,18,17,16,15 순서로 왼쪽부터)
const BOARD_LAYOUT = {
  top: [0, 1, 2, 3, 4, 5],           // 1-6
  right: [6, 7, 8, 9, 10, 11, 12, 13], // 7-14 (8칸)
  bottom: [19, 18, 17, 16, 15, 14],   // 20,19,18,17,16,15 (왼쪽부터)
};

// 연속 오름차순 구간 색상 팔레트
const RUN_COLORS = [
  { bg: "bg-emerald-500/30", border: "border-emerald-500", lightBg: "bg-emerald-200", lightBorder: "border-emerald-600" },
  { bg: "bg-blue-500/30", border: "border-blue-500", lightBg: "bg-blue-200", lightBorder: "border-blue-600" },
  { bg: "bg-amber-500/30", border: "border-amber-500", lightBg: "bg-amber-200", lightBorder: "border-amber-600" },
  { bg: "bg-rose-500/30", border: "border-rose-500", lightBg: "bg-rose-200", lightBorder: "border-rose-600" },
  { bg: "bg-violet-500/30", border: "border-violet-500", lightBg: "bg-violet-200", lightBorder: "border-violet-600" },
  { bg: "bg-cyan-500/30", border: "border-cyan-500", lightBg: "bg-cyan-200", lightBorder: "border-cyan-600" },
];

// 연속 오름차순 구간 계산
function calculateRuns(board: (number | "★" | null)[]): { startIdx: number; endIdx: number }[] {
  const runs: { startIdx: number; endIdx: number }[] = [];
  let runStart = -1;

  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      if (runStart !== -1 && i - runStart >= 2) {
        runs.push({ startIdx: runStart, endIdx: i - 1 });
      }
      runStart = -1;
      continue;
    }

    if (runStart === -1) {
      runStart = i;
      continue;
    }

    // 오름차순 검사 (같은 숫자 허용)
    const prev = board[i - 1];
    const curr = board[i];

    if (prev === null) {
      runStart = i;
      continue;
    }

    const prevNum = prev === "★" ? -Infinity : (prev as number);
    const currNum = curr === "★" ? Infinity : (curr as number);

    // 조커는 항상 유효, 같은 숫자도 유효
    if (prev !== "★" && curr !== "★" && prevNum > currNum) {
      // 오름차순 깨짐
      if (i - runStart >= 2) {
        runs.push({ startIdx: runStart, endIdx: i - 1 });
      }
      runStart = i;
    }
  }

  // 마지막 구간 처리
  if (runStart !== -1 && board.length - runStart >= 2) {
    let endIdx = board.length - 1;
    while (endIdx >= runStart && board[endIdx] === null) {
      endIdx--;
    }
    if (endIdx - runStart >= 1) {
      runs.push({ startIdx: runStart, endIdx });
    }
  }

  return runs;
}

export default function GameBoard({
  board,
  teamName,
  score,
  highlightIndex,
  isManualMode = false,
  onCellClick,
  showPlacementMarker = true,
}: GameBoardProps) {
  const cellSize = "w-14 h-14 text-lg";

  // 연속 구간 계산
  const runs = useMemo(() => calculateRuns(board), [board]);

  // 각 셀이 어떤 구간에 속하는지 매핑
  const cellRunIndex = useMemo(() => {
    const mapping: { [key: number]: number } = {};
    runs.forEach((run, idx) => {
      for (let i = run.startIdx; i <= run.endIdx; i++) {
        if (board[i] !== null) {
          mapping[i] = idx;
        }
      }
    });
    return mapping;
  }, [runs, board]);

  const renderCell = (index: number) => {
    const value = board[index];
    const isEmpty = value === null;
    const isHighlight = highlightIndex === index;
    const isJoker = value === "★";
    const runIdx = cellRunIndex[index];
    const hasRun = runIdx !== undefined;
    const runColor = hasRun ? RUN_COLORS[runIdx % RUN_COLORS.length] : null;

    return (
      <div
        key={index}
        onClick={() => isEmpty && isManualMode && onCellClick?.(index)}
        className={`
          ${cellSize} flex items-center justify-center rounded-lg border-2 font-digital font-bold
          transition-all duration-200
          ${isEmpty
            ? isManualMode
              ? "border-red-500/50 bg-red-500/10 cursor-pointer hover:bg-red-500/20 animate-blink"
              : "border-[var(--cell-border)] bg-[var(--cell-bg)]"
            : isJoker
              ? "border-purple-500 bg-purple-500/20 text-purple-400"
              : hasRun && runColor
                ? `${runColor.border} ${runColor.bg} light:${runColor.lightBorder} light:${runColor.lightBg}`
                : "border-accent bg-accent/20"
          }
          ${isHighlight ? "ring-2 ring-accent animate-pulse-glow" : ""}
        `}
        style={isEmpty ? {
          borderColor: 'var(--cell-border)',
          backgroundColor: 'var(--cell-bg)',
          color: 'var(--cell-text)'
        } : !isJoker ? {
          color: 'var(--text-strong)'
        } : undefined}
      >
        <span className="font-digital" style={isEmpty ? { color: 'var(--cell-text)' } : undefined}>
          {isEmpty ? index + 1 : value}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-surface/30 rounded-xl p-4 border border-border">
      {/* 범례 */}
      {showPlacementMarker && (
        <div className="flex items-center justify-end gap-4 mb-3 text-xs text-muted font-mono-digital">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-accent/30 rounded" />
            <span>배치완료</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500/30 rounded" />
            <span>조커</span>
          </div>
        </div>
      )}

      {/* 전체 레이아웃 - 역ㄷ자 형태 */}
      <div className="flex">
        {/* 왼쪽: 점수 표시 영역 (역ㄷ자 가운데) */}
        <div className="flex flex-col items-center justify-center pr-4" style={{ minWidth: '120px' }}>
          <div className="text-center">
            <div className="font-digital text-lg text-muted mb-1">{teamName}</div>
            <div className="font-digital text-6xl font-black text-primary drop-shadow-lg">
              {score}
            </div>
            <div className="font-digital text-base text-muted mt-1">POINTS</div>
          </div>
        </div>

        {/* 오른쪽: 보드 영역 */}
        <div className="flex flex-col">
          {/* 상단 가로줄 (1-6) */}
          <div className="flex gap-1">
            {BOARD_LAYOUT.top.map((idx) => renderCell(idx))}
          </div>

          {/* 오른쪽 세로줄 (7-14) - 6번 칸 바로 아래에 붙임 */}
          <div className="flex flex-col gap-1 mt-1 self-end">
            {BOARD_LAYOUT.right.map((idx) => renderCell(idx))}
          </div>

          {/* 하단 가로줄 (20-15) */}
          <div className="flex gap-1 mt-1">
            {BOARD_LAYOUT.bottom.map((idx) => renderCell(idx))}
          </div>
        </div>
      </div>
    </div>
  );
}
