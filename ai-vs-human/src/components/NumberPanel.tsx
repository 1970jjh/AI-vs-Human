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
  disabled = false,
  shuffledDeck = [],
  revealedCovers = [],
  onRevealCover,
}: NumberPanelProps) {
  const totalUsed = usedNumbers.length;

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
    <div className="rounded-xl p-2 border flex flex-col h-full min-h-0" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
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
        className="w-full mb-2 py-1.5 flex items-center justify-center gap-2 bg-primary/20 text-primary
          rounded-lg font-digital font-bold text-sm hover:bg-primary/30 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-lg">🎲</span>
        <span>랜덤 숫자 출제</span>
      </button>

      {/* 덮개 그리드 - 5열 x 8행 = 40개 (남은 높이를 꽉 채움) */}
      <div className="grid grid-cols-5 grid-rows-8 gap-[3px] flex-1 min-h-0">
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
                flex items-center justify-center rounded-md font-digital font-black leading-none
                transition-transform duration-200
                ${isRevealed
                  ? isJoker
                    ? "bg-gradient-to-br from-purple-500/50 to-pink-500/50 border border-purple-400/60 shadow-inner"
                    : "bg-gradient-to-br from-emerald-500/40 to-teal-500/40 border border-emerald-400/60 shadow-inner"
                  : `bg-gradient-to-br from-indigo-500/80 via-purple-500/70 to-pink-500/80
                     border border-indigo-300/40 shadow-md shadow-purple-500/20
                     hover:brightness-125 hover:scale-105 active:scale-95 cursor-pointer`
                }
              `}
              style={{ containerType: "size" }}
            >
              <span
                className="text-white drop-shadow-md"
                style={{ fontSize: "min(56cqh, 40cqw)", fontWeight: 900 }}
              >
                {isRevealed ? card : coverLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-1.5 pt-1.5 border-t text-xs text-muted font-mono-digital" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-indigo-500/70 to-pink-500/70 border border-indigo-300/40" />
            <span>미공개</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-500/50 to-teal-500/50 border border-emerald-400/50" />
            <span>공개</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-purple-500/50 to-pink-500/50 border border-purple-400/50" />
            <span>조커</span>
          </div>
        </div>
      </div>
    </div>
  );
}
