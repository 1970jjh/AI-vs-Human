"use client";

interface NumberPanelProps {
  usedNumbers: (number | "★")[];
  currentNumber: number | "★" | null;
  onSelectNumber?: (number: number | "★") => void;
  onRandomSelect?: () => void;
  disabled?: boolean;
}

// 전체 카드 목록 생성 (40장: 1-10 각 1장, 11-19 각 2장, 20-30 각 1장, 조커 1장)
function createCardList(): (number | "★")[] {
  const cards: (number | "★")[] = [];
  // 1-10: 각 1장
  for (let i = 1; i <= 10; i++) cards.push(i);
  // 11-19: 각 2장
  for (let i = 11; i <= 19; i++) {
    cards.push(i);
    cards.push(i);
  }
  // 20-30: 각 1장
  for (let i = 20; i <= 30; i++) cards.push(i);
  // 조커 1장
  cards.push("★");
  return cards;
}

export default function NumberPanel({
  usedNumbers,
  currentNumber,
  onSelectNumber,
  onRandomSelect,
  disabled = false,
}: NumberPanelProps) {
  const allCards = createCardList(); // 40장

  // 각 카드가 사용되었는지 추적 (인덱스 기반)
  const getUsedIndices = () => {
    const usedIndices: number[] = [];
    const tempUsed = [...usedNumbers];

    for (let i = 0; i < allCards.length; i++) {
      const card = allCards[i];
      const idx = tempUsed.indexOf(card);
      if (idx !== -1) {
        usedIndices.push(i);
        tempUsed.splice(idx, 1);
      }
    }
    return usedIndices;
  };

  const usedIndices = getUsedIndices();
  const totalUsed = usedNumbers.length;
  const totalCards = 20;

  const handleCardClick = (cardIndex: number) => {
    if (disabled || usedIndices.includes(cardIndex)) return;
    const card = allCards[cardIndex];
    onSelectNumber?.(card);
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
      {onRandomSelect && (
        <button
          onClick={onRandomSelect}
          disabled={disabled}
          className="w-full mb-4 py-3 flex items-center justify-center gap-2 bg-primary/20 text-primary
            rounded-lg font-digital font-bold hover:bg-primary/30 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl">🎲</span>
          <span>랜덤 숫자 출제</span>
        </button>
      )}

      {/* 현재 선택된 숫자 표시 */}
      {currentNumber !== null && (
        <div className="mb-4 p-4 bg-primary/20 rounded-lg text-center animate-pulse">
          <span className="text-sm text-muted font-mono-digital">출제된 숫자</span>
          <div className={`font-digital text-5xl font-bold ${currentNumber === "★" ? "text-purple-400" : "text-white"}`}>
            {currentNumber}
          </div>
        </div>
      )}

      {/* 숫자 그리드 - 8열 */}
      <div className="grid grid-cols-8 gap-1">
        {allCards.map((card, idx) => {
          const isUsed = usedIndices.includes(idx);
          const isJoker = card === "★";
          const isCurrent = currentNumber === card && !isUsed;

          return (
            <button
              key={idx}
              onClick={() => handleCardClick(idx)}
              disabled={isUsed || disabled}
              className={`
                aspect-square flex items-center justify-center rounded border-2 font-digital font-bold text-xs
                transition-all duration-200
                ${isUsed
                  ? "bg-muted/10 border-muted/30 text-muted/50 cursor-not-allowed line-through"
                  : isCurrent
                    ? "bg-accent/30 border-accent text-accent ring-2 ring-accent"
                    : isJoker
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30 cursor-pointer"
                      : "border-border hover:border-accent/50 hover:bg-accent/10 cursor-pointer"
                }
              `}
              style={!isUsed && !isCurrent && !isJoker ? { backgroundColor: "var(--surface)", color: "var(--text)" } : undefined}
            >
              {card}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-3 pt-2 border-t text-xs text-muted font-mono-digital" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-muted/50 rounded" />
            <span>사용됨</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded" />
            <span>조커</span>
          </div>
        </div>
        <div className="mt-1 text-muted/70">
          11~19: 각 2장씩
        </div>
      </div>
    </div>
  );
}
