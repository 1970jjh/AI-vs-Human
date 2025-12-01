"use client";

import { BOARD_SIZE } from "@/lib/types";

interface GameBoardProps {
  board: (number | "★" | null)[];
  teamName: string;
  teamNumber?: number;
  memberCount?: number;
  score: number;
  highlightIndex?: number;
  isManualMode?: boolean;
  onCellClick?: (index: number) => void;
  showPlacementMarker?: boolean;
  showScoreMarker?: boolean;
  compact?: boolean;
}

// 보드 레이아웃 (이미지 참고: L자 형태)
const BOARD_LAYOUT = {
  // 상단 가로줄 (1-8)
  top: [0, 1, 2, 3, 4, 5, 6, 7],
  // 오른쪽 세로줄 (9-12)
  right: [8, 9, 10, 11],
  // 하단 가로줄 (13-20, 역순)
  bottom: [19, 18, 17, 16, 15, 14, 13, 12],
};

export default function GameBoard({
  board,
  teamName,
  teamNumber,
  memberCount,
  score,
  highlightIndex,
  isManualMode = false,
  onCellClick,
  showPlacementMarker = true,
  showScoreMarker = true,
  compact = false,
}: GameBoardProps) {
  const cellSize = compact ? "w-10 h-10 text-sm" : "w-14 h-14 text-lg";

  const renderCell = (index: number) => {
    const value = board[index];
    const isEmpty = value === null;
    const isHighlight = highlightIndex === index;
    const isJoker = value === "★";

    return (
      <div
        key={index}
        onClick={() => isEmpty && isManualMode && onCellClick?.(index)}
        className={`
          ${cellSize} flex items-center justify-center rounded-lg border-2 font-bold
          transition-all duration-200
          ${isEmpty
            ? isManualMode
              ? "border-red-500/50 bg-red-500/10 cursor-pointer hover:bg-red-500/20 animate-blink"
              : "border-border bg-surface/50"
            : isJoker
              ? "border-purple-500 bg-purple-500/20 text-purple-400"
              : "border-accent/50 bg-accent/10 text-accent"
          }
          ${isHighlight ? "ring-2 ring-accent animate-pulse-glow" : ""}
        `}
      >
        {isEmpty ? index + 1 : value}
      </div>
    );
  };

  return (
    <div className="bg-surface/30 rounded-xl p-4 border border-border">
      {/* 범례 */}
      {showPlacementMarker && (
        <div className="flex items-center justify-end gap-4 mb-3 text-xs text-muted">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-accent/30 rounded" />
            <span>배치완료</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500/30 rounded" />
            <span>점수획득 (연속)</span>
          </div>
        </div>
      )}

      {/* 상단 가로줄 */}
      <div className="flex gap-1 mb-1">
        {BOARD_LAYOUT.top.map((idx) => renderCell(idx))}
      </div>

      {/* 중간 영역 */}
      <div className="flex">
        {/* 왼쪽 빈 공간 */}
        <div className="flex-1" />

        {/* 중앙 팀 정보 */}
        <div className="flex flex-col items-center justify-center px-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-bold text-white">
              {teamNumber ? `${teamNumber}조` : teamName}
            </span>
            {memberCount !== undefined && (
              <span className="px-2 py-0.5 text-xs bg-muted/20 text-muted rounded">
                {memberCount}명
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-primary">{score}</span>
            <span className="text-sm text-muted">점</span>
          </div>
          {!teamNumber && (
            <span className="text-xs text-muted mt-1">{teamName}</span>
          )}
        </div>

        {/* 오른쪽 세로줄 */}
        <div className="flex flex-col gap-1">
          {BOARD_LAYOUT.right.map((idx) => renderCell(idx))}
        </div>
      </div>

      {/* 하단 가로줄 */}
      <div className="flex gap-1 mt-1">
        {BOARD_LAYOUT.bottom.map((idx) => renderCell(idx))}
      </div>
    </div>
  );
}
