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
  isAdmin = false,
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

  return (
    <div className="bg-surface rounded-xl p-4 border border-border">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-muted">현재 출제된 숫자</div>
          <div className="flex items-center gap-2">
            <span className="text-accent font-bold">출제 가능</span>
            <div className="w-3 h-3 bg-accent rounded-full" />
          </div>
        </div>
      </div>

      {/* 다음 숫자 선택 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted">다음 숫자 선택</span>
          {isAdmin && onRandomSelect && (
            <button
              onClick={onRandomSelect}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg
                hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>🎲</span>
              <span className="text-sm">랜덤 선택</span>
            </button>
          )}
        </div>

        {/* 현재 선택된 숫자 표시 */}
        {currentNumber !== null && (
          <div className="mb-4 p-4 bg-accent/20 rounded-lg text-center">
            <span className="text-sm text-muted">현재 숫자</span>
            <div className="text-4xl font-bold text-accent">
              {currentNumber}
            </div>
          </div>
        )}
      </div>

      {/* 숫자 그리드 */}
      <div className="grid grid-cols-5 gap-2">
        {numbers.map((num) => {
          const available = getAvailableCount(num);
          const isUsed = available <= 0;
          const isJoker = num === "★";
          const isCurrent = currentNumber === num;

          return (
            <button
              key={num}
              onClick={() => !isUsed && !disabled && isAdmin && onSelectNumber?.(num)}
              disabled={isUsed || disabled || !isAdmin}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg border-2 font-bold
                transition-all duration-200
                ${isUsed
                  ? "bg-muted/10 border-muted/30 text-muted/50 cursor-not-allowed line-through"
                  : isCurrent
                    ? "bg-accent/30 border-accent text-accent ring-2 ring-accent"
                    : isJoker
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30"
                      : "bg-surface border-border text-white hover:border-accent/50 hover:bg-accent/10"
                }
                ${isAdmin && !isUsed && !disabled ? "cursor-pointer" : "cursor-default"}
              `}
            >
              <span className={isJoker ? "text-xl" : "text-lg"}>{num}</span>
              {!isJoker && available > 1 && !isUsed && (
                <span className="text-[10px] text-muted">x{available}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택 필요 안내 */}
      {isAdmin && currentNumber === null && !disabled && (
        <div className="mt-4 p-3 bg-muted/10 rounded-lg text-center text-muted">
          선택 필요
        </div>
      )}
    </div>
  );
}
