"use client";

interface NumberPanelProps {
  usedNumbers: (number | "★")[];
  currentNumber: number | "★" | null;
  onSelectNumber?: (number: number | "★") => void;
  onRandomSelect?: () => void;
  disabled?: boolean;
  // 덮개 시스템용
  shuffledDeck?: (number | "★")[];
  revealedCovers?: boolean[];
  onRevealCover?: (index: number) => void;
}

// 덮개 레이블 생성 (A1-H5, 8행 x 5열 = 40개)
function getCoverLabel(index: number): string {
  const row = Math.floor(index / 5);
  const col = (index % 5) + 1;
  const rowLabel = String.fromCharCode(65 + row); // A, B, C, D, E, F, G, H
  return `${rowLabel}${col}`;
}

export default function NumberPanel({
  usedNumbers,
  currentNumber,
  onSelectNumber,
  onRandomSelect,
  disabled = false,
  shuffledDeck = [],
  revealedCovers = [],
  onRevealCover,
}: NumberPanelProps) {
  const totalUsed = usedNumbers.length;
  const totalCards = 40;

  // 덮개 클릭 핸들러
  const handleCoverClick = (index: number) => {
    if (disabled || revealedCovers[index]) return;
    onRevealCover?.(index);
  };

  // 랜덤 버튼 클릭 - 남은 덮개 중 하나를 랜덤하게 선택
  const handleRandomClick = () => {
    if (disabled) return;

    // 아직 열리지 않은 덮개 인덱스 찾기
    const unrevealedIndices: number[] = [];
    for (let i = 0; i < 40; i++) {
      if (!revealedCovers[i]) {
        unrevealedIndices.push(i);
      }
    }

    if (unrevealedIndices.length === 0) return;

    // 랜덤 선택
    const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
    onRevealCover?.(randomIndex);
  };

  return (
    <div className="rounded-xl p-3 border" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-digital font-bold text-base" style={{ color: "var(--text)" }}>숫자 선택</h3>
          <p className="font-mono-digital text-xs text-muted">
            사용: {totalUsed}/20
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-accent rounded-full" />
          <span className="text-xs text-muted font-mono-digital">선택 가능</span>
        </div>
      </div>

      {/* 랜덤 선택 버튼 */}
      <button
        onClick={handleRandomClick}
        disabled={disabled}
        className="w-full mb-2 py-2 flex items-center justify-center gap-2 bg-primary/20 text-primary
          rounded-lg font-digital font-bold text-sm hover:bg-primary/30 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-lg">🎲</span>
        <span>랜덤 숫자 출제</span>
      </button>

      {/* 현재 선택된 숫자 표시 */}
      {currentNumber !== null && (
        <div className="mb-2 p-2 bg-primary/20 rounded-lg text-center animate-pulse">
          <span className="text-xs text-muted font-mono-digital">출제된 숫자</span>
          <div className={`font-digital text-3xl font-bold ${currentNumber === "★" ? "text-purple-400" : "text-white"}`}>
            {currentNumber}
          </div>
        </div>
      )}

      {/* 덮개 그리드 - 5열 x 8행 = 40개 */}
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 40 }).map((_, idx) => {
          const isRevealed = revealedCovers[idx];
          const card = shuffledDeck[idx];
          const isJoker = card === "★";
          const coverLabel = getCoverLabel(idx);

          return (
            <button
              key={idx}
              onClick={() => handleCoverClick(idx)}
              disabled={isRevealed || disabled}
              className={`
                aspect-square flex items-center justify-center rounded-md font-digital font-bold
                transition-all duration-300 transform
                ${isRevealed
                  ? isJoker
                    ? "bg-purple-500/40 text-purple-300 border border-purple-400/50"
                    : "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
                  : `backdrop-blur-md bg-white/10 border border-white/20 text-white/90
                     hover:bg-white/20 hover:border-white/40 hover:scale-105
                     hover:shadow-lg hover:shadow-white/10 cursor-pointer
                     active:scale-95`
                }
              `}
              style={{
                minHeight: "36px",
                fontSize: isRevealed ? "14px" : "11px"
              }}
            >
              {isRevealed ? (
                <span className={`font-bold ${isJoker ? "text-purple-300" : "text-emerald-300"}`}>
                  {card}
                </span>
              ) : (
                <span className="font-mono-digital font-semibold tracking-tight">
                  {coverLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-2 pt-2 border-t text-xs text-muted font-mono-digital" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded backdrop-blur-md bg-white/20 border border-white/30" />
            <span>미공개</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500/50 rounded border border-emerald-400/50" />
            <span>공개</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500/50 rounded border border-purple-400/50" />
            <span>조커</span>
          </div>
        </div>
      </div>
    </div>
  );
}
