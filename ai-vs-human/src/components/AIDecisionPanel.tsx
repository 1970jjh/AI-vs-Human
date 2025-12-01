"use client";

interface AIDecision {
  number: number | "★";
  index: number;
  reason: string;
  confidence: number;
  timestamp: number;
  strategy?: string;
}

interface AIDecisionPanelProps {
  decisions: AIDecision[];
  currentScore: number;
}

export default function AIDecisionPanel({
  decisions,
  currentScore,
}: AIDecisionPanelProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-400";
    if (confidence >= 70) return "text-yellow-400";
    if (confidence >= 50) return "text-orange-400";
    return "text-red-400";
  };

  const getConfidenceBar = (confidence: number) => {
    if (confidence >= 90) return "bg-green-500";
    if (confidence >= 70) return "bg-yellow-500";
    if (confidence >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-surface rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">AI 결정 로그</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">현재 점수:</span>
          <span className="text-xl font-bold text-primary">{currentScore}점</span>
        </div>
      </div>

      {decisions.length === 0 ? (
        <div className="text-center py-8 text-muted">
          <div className="text-4xl mb-2">🤖</div>
          <p>숫자를 선택하면 AI가 최적의 위치에 배치합니다</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {decisions.map((decision, idx) => (
            <div
              key={decision.timestamp}
              className={`p-3 rounded-lg border transition-all ${
                idx === 0
                  ? "bg-primary/10 border-primary/50 animate-pulse"
                  : "bg-surface/50 border-border"
              }`}
            >
              {/* 상단: 숫자와 위치 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-lg ${
                      decision.number === "★"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                        : "bg-accent/20 text-accent border border-accent/50"
                    }`}
                  >
                    {decision.number}
                  </span>
                  <div>
                    <div className="text-sm text-muted">배치 위치</div>
                    <div className="font-bold">{decision.index + 1}번 칸</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted">신뢰도</div>
                  <div className={`font-bold ${getConfidenceColor(decision.confidence)}`}>
                    {decision.confidence}%
                  </div>
                </div>
              </div>

              {/* 신뢰도 바 */}
              <div className="h-1.5 bg-muted/20 rounded-full mb-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getConfidenceBar(
                    decision.confidence
                  )}`}
                  style={{ width: `${decision.confidence}%` }}
                />
              </div>

              {/* 전략 */}
              {decision.strategy && (
                <div className="mb-2">
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                    {decision.strategy}
                  </span>
                </div>
              )}

              {/* 이유 */}
              <p className="text-sm text-muted">{decision.reason}</p>
            </div>
          ))}
        </div>
      )}

      {/* 통계 */}
      {decisions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-surface/50 rounded-lg">
              <div className="text-xs text-muted">배치 수</div>
              <div className="font-bold text-accent">{decisions.length}</div>
            </div>
            <div className="p-2 bg-surface/50 rounded-lg">
              <div className="text-xs text-muted">평균 신뢰도</div>
              <div className="font-bold text-yellow-400">
                {Math.round(
                  decisions.reduce((sum, d) => sum + d.confidence, 0) /
                    decisions.length
                )}
                %
              </div>
            </div>
            <div className="p-2 bg-surface/50 rounded-lg">
              <div className="text-xs text-muted">남은 칸</div>
              <div className="font-bold text-primary">{20 - decisions.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
