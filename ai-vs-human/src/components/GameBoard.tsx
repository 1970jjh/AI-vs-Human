"use client";

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
const BOARD_LAYOUT = {
  // 상단 가로줄 (1-6번 칸)
  top: [0, 1, 2, 3, 4, 5],
  // 오른쪽 세로줄 (7-15번 칸)
  right: [6, 7, 8, 9, 10, 11, 12, 13, 14],
  // 하단 가로줄 (16-20번 칸, 왼쪽으로)
  bottom: [19, 18, 17, 16, 15],
};

export default function GameBoard({
  board,
  teamName,
  score,
  highlightIndex,
  isManualMode = false,
  onCellClick,
  showPlacementMarker = true,
}: GameBoardProps) {
  const cellSize = "w-16 h-16 text-xl";

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
          ${cellSize} flex items-center justify-center rounded-lg border-2 font-digital font-bold
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
        <span className="font-digital">{isEmpty ? index + 1 : value}</span>
      </div>
    );
  };

  return (
    <div className="bg-surface/30 rounded-xl p-6 border border-border">
      {/* 범례 */}
      {showPlacementMarker && (
        <div className="flex items-center justify-end gap-4 mb-4 text-xs text-muted font-mono-digital">
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

      {/* 상단 가로줄 (1-6) */}
      <div className="flex gap-1.5 mb-1.5">
        {BOARD_LAYOUT.top.map((idx) => renderCell(idx))}
      </div>

      {/* 중간 영역 */}
      <div className="flex">
        {/* 왼쪽 - 점수 표시 영역 */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-[400px]">
          <div className="text-center">
            <div className="font-digital text-2xl text-muted mb-2">{teamName}</div>
            <div className="font-digital text-8xl font-black text-primary drop-shadow-lg">
              {score}
            </div>
            <div className="font-digital text-2xl text-muted mt-2">POINTS</div>
          </div>
        </div>

        {/* 오른쪽 세로줄 (7-15) */}
        <div className="flex flex-col gap-1.5">
          {BOARD_LAYOUT.right.map((idx) => renderCell(idx))}
        </div>
      </div>

      {/* 하단 가로줄 (16-20, 오른쪽 정렬) */}
      <div className="flex gap-1.5 mt-1.5 justify-end">
        {BOARD_LAYOUT.bottom.map((idx) => renderCell(idx))}
      </div>
    </div>
  );
}
