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
// 1-6: 상단 가로줄
// 7-14: 오른쪽 세로줄 (6번 바로 아래부터)
// 15-20: 하단 가로줄 (20,19,18,17,16,15 순서로 왼쪽부터)
const BOARD_LAYOUT = {
  top: [0, 1, 2, 3, 4, 5],           // 1-6
  right: [6, 7, 8, 9, 10, 11, 12, 13], // 7-14 (8칸)
  bottom: [19, 18, 17, 16, 15, 14],   // 20,19,18,17,16,15 (왼쪽부터)
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
  const cellSize = "w-12 h-12 text-base";

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

      {/* 전체 레이아웃 */}
      <div className="flex">
        {/* 왼쪽: 점수 표시 영역 */}
        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <div className="text-center">
            <div className="font-digital text-xl text-muted mb-1">{teamName}</div>
            <div className="font-digital text-6xl font-black text-primary drop-shadow-lg">
              {score}
            </div>
            <div className="font-digital text-lg text-muted mt-1">POINTS</div>
          </div>
        </div>

        {/* 오른쪽: 보드 영역 */}
        <div className="flex flex-col">
          {/* 상단 가로줄 (1-6) */}
          <div className="flex gap-1 justify-end">
            {BOARD_LAYOUT.top.map((idx) => renderCell(idx))}
          </div>

          {/* 오른쪽 세로줄 (7-14) - 6번 칸 아래에 정렬 */}
          <div className="flex flex-col gap-1 mt-1 items-end">
            {BOARD_LAYOUT.right.map((idx) => renderCell(idx))}
          </div>

          {/* 하단 가로줄 (20-15) - 14번 칸과 연결, 6칸 */}
          <div className="flex gap-1 mt-1 justify-end">
            {BOARD_LAYOUT.bottom.map((idx) => renderCell(idx))}
          </div>
        </div>
      </div>
    </div>
  );
}
