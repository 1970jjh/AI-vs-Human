"use client";

import { SCORE_TABLE } from "@/lib/types";

export default function ScoreTable() {
  const scores = SCORE_TABLE.slice(1); // 0번 인덱스 제외

  return (
    <div className="bg-surface rounded-xl p-3 border border-border">
      <h3 className="text-xs font-digital font-bold text-muted mb-2">점수표</h3>

      <div className="grid grid-cols-4 gap-1 text-xs">
        {scores.map((score, idx) => (
          <div
            key={idx}
            className={`flex justify-between items-center px-1.5 py-0.5 rounded font-mono-digital ${
              idx + 1 === 16 ? "bg-primary/20 border border-primary/50" : "bg-surface/50"
            }`}
          >
            <span className="text-muted">{idx + 1}</span>
            <span className={`font-bold ${idx + 1 === 16 ? "text-primary" : "text-accent"}`}>
              +{score}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-border text-xs text-muted font-mono-digital text-center">
        16칸 연속 = 72점 (목표)
      </div>
    </div>
  );
}
