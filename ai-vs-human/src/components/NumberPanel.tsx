"use client";

import { createDeck } from "@/lib/ai-logic";

interface NumberPanelProps {
  usedNumbers: (number | "★")[];
  currentNumber: number | "★" | null;
  onSelectNumber?: (number: number | "★") => void;
  onRandomSelect?: () => void;
  isAdmin?: boolean;
  disabled?: boolean;
}

export default function NumberPanel({
  usedNumbers,
  currentNumber,
  onSelectNumber,
  onRandomSelect,
  isAdmin = true,
  disabled = false,
}: NumberPanelProps) {
  const deck = createDeck();

  // 각 숫자의 사용 가능 횟수 계산
  const getAvailableCount = (num: number | "★") => {
    const totalInDeck = deck.filter((n) => n === num).length;
    const usedCount = usedNumbers.filter((n) => n === num).length;
    return totalInDeck - usedCount;
  };

  // 숫자 배열 생성 (1-30 + 조커)
  const numbers: (number | "★")[] = [];
  for (let i = 1; i <= 30; i++) numbers.push(i);
  numbers.push("★");

  const totalUsed = usedNumbers.length;
  const totalCards = 20;

  return (
    <div className="bg-surface rounded-xl p-4 border border-border">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">숫자 선택</h3>
          <p className="text-sm text-muted">
            사용: {totalUsed}/{totalCards}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-accent rounded-full" />
          <span className="text-xs text-muted">선택 가능</span>
        </div>
      </div>

      {/* 랜덤 선택 버튼 */}
      {onRandomSelect && (
        <button
          onClick={onRandomSelect}
          disabled={disabled}
          className="w-full mb-4 py-3 flex items-center justify-center gap-2 bg-primary/20 text-primary
            rounded-lg font-bold hover:bg-primary/30 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl">🎲</span>
          <span>랜덤 숫자 출제</span>
        </button>
      )}

      {/* 현재 선택된 숫자 표시 */}
      {currentNumber !== null && (
        <div className="mb-4 p-4 bg-primary/20 rounded-lg text-center animate-pulse">
          <span className="text-sm text-muted">출제된 숫자</span>
          <div className={`text-4xl font-bold ${currentNumber === "★" ? "text-purple-400" : "text-primary"}`}>
            {currentNumber}
          </div>
        </div>
      )}

      {/* 숫자 그리드 */}
      <div className="grid grid-cols-5 gap-1.5">
        {numbers.map((num) => {
          const available = getAvailableCount(num);
          const isUsed = available <= 0;
          const isJoker = num === "★";
          const isCurrent = currentNumber === num;

          return (
            <button
              key={num}
              onClick={() => !isUsed && !disabled && onSelectNumber?.(num)}
              disabled={isUsed || disabled}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg border-2 font-bold
                transition-all duration-200
                ${isUsed
                  ? "bg-muted/10 border-muted/30 text-muted/50 cursor-not-allowed line-through"
                  : isCurrent
                    ? "bg-accent/30 border-accent text-accent ring-2 ring-accent"
                    : isJoker
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30 cursor-pointer"
                      : "bg-surface border-border text-white hover:border-accent/50 hover:bg-accent/10 cursor-pointer"
                }
              `}
            >
              <span className={isJoker ? "text-lg" : "text-sm"}>{num}</span>
              {!isJoker && available > 1 && !isUsed && (
                <span className="text-[9px] text-muted">x{available}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-muted/50 rounded line-through" />
            <span>사용됨</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded" />
            <span>조커</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted">x2</span>
            <span>2장 남음</span>
          </div>
        </div>
      </div>
    </div>
  );
}
