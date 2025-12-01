"use client";

import { Participant } from "@/lib/types";

interface RankingListProps {
  participants: Participant[];
  maxDisplay?: number;
}

export default function RankingList({
  participants,
  maxDisplay = 5,
}: RankingListProps) {
  // 점수순 정렬
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
  const displayList = sortedParticipants.slice(0, maxDisplay);

  return (
    <div className="bg-surface rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <span className="text-primary">👥</span>
          <span>실시간 순위</span>
        </h3>
        <span className="text-xs text-muted">총 {participants.length}팀</span>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-8 text-muted">참가자가 없습니다</div>
      ) : (
        <div className="space-y-2">
          {displayList.map((participant, idx) => (
            <div
              key={participant.id}
              className={`
                flex items-center justify-between p-3 rounded-lg
                ${idx === 0 ? "bg-accent/20 border border-accent/30" : "bg-surface/50"}
              `}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`
                    w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold
                    ${idx === 0 ? "bg-accent text-black" : "bg-muted/30 text-muted"}
                  `}
                >
                  {idx + 1}
                </span>
                <span className="font-medium">{participant.odusername}</span>
              </div>
              <span
                className={`font-bold ${
                  idx === 0 ? "text-accent" : "text-primary"
                }`}
              >
                {participant.score}점
              </span>
            </div>
          ))}
        </div>
      )}

      {participants.length > maxDisplay && (
        <div className="mt-3 text-center text-xs text-muted">
          +{participants.length - maxDisplay}명 더보기
        </div>
      )}
    </div>
  );
}
