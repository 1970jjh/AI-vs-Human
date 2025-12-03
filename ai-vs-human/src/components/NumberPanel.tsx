"use client";

interface NumberPanelProps {
  usedNumbers: (number | "★")[];
  currentNumber: number | "★" | null;
  onSelectNumber?: (number: number | "★") => void;
  onRandomSelect?: () => void;
  disabled?: boolean;
  // 새로운 props: 덮개 시스템용
  shuffledDeck?: (number | "★")[];
  revealedCovers?: boolean[];
  onRevealCover?: (index: number) => void;
}

// 덮개 레이블 생성 (A1-E4, 5행 x 4열 = 20개)
function getCoverLabel(index: number): string {
  const row = Math.floor(index / 4);
  const col = (index % 4) + 1;
  const rowLabel = String.fromCharCode(65 + row); // A, B, C, D, E
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
  const totalCards = 20;

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
    for (let i = 0; i < 20; i++) {
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
    <div className="rounded-xl p-4 border" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-digital font-bold text-lg" style={{ color: "var(--text)" }}>숫자 선택</h3>
          <p className="font-mono-digital text-sm text-muted">
            사용: {totalUsed}/{totalCards}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-accent rounded-full" />
          <span className="text-xs text-muted font-mono-digital">선택 가능</span>
        </div>
      </div>

      {/* 랜덤 선택 버튼 */}
      <button
        onClick={handleRandomClick}
        disabled={disabled}
        className="w-full mb-4 py-3 flex items-center justify-center gap-2 bg-primary/20 text-primary
          rounded-lg font-digital font-bold hover:bg-primary/30 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-xl">🎲</span>
        <span>랜덤 숫자 출제</span>
      </button>

      {/* 현재 선택된 숫자 표시 */}
      {currentNumber !== null && (
        <div className="mb-4 p-4 bg-primary/20 rounded-lg text-center animate-pulse">
          <span className="text-sm text-muted font-mono-digital">출제된 숫자</span>
          <div className={`font-digital text-5xl font-bold ${currentNumber === "★" ? "text-purple-400" : "text-white"}`}>
            {currentNumber}
          </div>
        </div>
      )}

      {/* 덮개 그리드 - 5행 x 4열 */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 20 }).map((_, idx) => {
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
                aspect-square flex items-center justify-center rounded-lg border-2 font-digital font-bold text-sm
                transition-all duration-300 transform
                ${isRevealed
                  ? isJoker
                    ? "bg-purple-500/30 border-purple-500 text-purple-400"
                    : "bg-accent/20 border-accent/50 text-accent"
                  : "bg-gradient-to-br from-blue-600 to-purple-600 border-blue-400 text-white hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 cursor-pointer"
                }
                ${isRevealed ? "cursor-default" : ""}
              `}
              style={{
                minHeight: "50px"
              }}
            >
              {isRevealed ? (
                <span className={`text-xl ${isJoker ? "text-purple-400" : ""}`}>
                  {card}
                </span>
              ) : (
                <span className="text-xs font-mono-digital opacity-90">
                  {coverLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-3 pt-2 border-t text-xs text-muted font-mono-digital" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-600 to-purple-600" />
            <span>미공개</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-accent/50 rounded" />
            <span>공개됨</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500 rounded" />
            <span>조커</span>
          </div>
        </div>
        <div className="mt-1 text-muted/70">
          덮개를 클릭하거나 랜덤 버튼을 눌러 숫자를 공개하세요
        </div>
      </div>
    </div>
  );
}
