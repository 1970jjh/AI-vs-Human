"use client";

import { SCORE_TABLE } from "@/lib/types";

interface ScoreTableProps {
  compact?: boolean;
}

export default function ScoreTable({ compact = false }: ScoreTableProps) {
  const scores = SCORE_TABLE.slice(1); // 0번 인덱스 제외

  return (
    <div className="bg-surface rounded-xl p-4 border border-border">
      <h3 className="text-sm font-bold text-muted mb-3">점수표</h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {/* 1-10칸 */}
        <div className="space-y-1">
          {scores.slice(0, 10).map((score, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center px-2 py-1 bg-surface/50 rounded text-sm"
            >
              <span className="text-muted">{idx + 1}칸</span>
              <span className="text-accent font-bold">+{score}</span>
            </div>
          ))}
        </div>

        {/* 11-20칸 */}
        <div className="space-y-1">
          {scores.slice(10, 20).map((score, idx) => (
            <div
              key={idx + 10}
              className="flex justify-between items-center px-2 py-1 bg-surface/50 rounded text-sm"
            >
              <span className="text-muted">{idx + 11}칸</span>
              <span className="text-accent font-bold">+{score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
