"use client";

interface AIDecision {
  number: number | "★";
  index: number;
  reason: string;
  confidence: number;
  timestamp: number;
  strategy?: string;
  outlook?: { low: number; mid: number; high: number };
}

interface AIDecisionPanelProps {
  decisions: AIDecision[];
  currentScore: number;
  title: string;
}

export default function AIDecisionPanel({
  decisions,
  currentScore,
  title,
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
    <div className="bg-surface rounded-xl p-4 border border-border h-full flex flex-col min-h-0">
      {/* 헤더 + 통계 */}
      <div className="mb-3 flex-shrink-0">
        <h3 className="font-digital font-bold text-base leading-tight text-primary mb-2">
          {title}
        </h3>

        {/* 통계 - 제목 바로 아래 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-1.5 bg-surface/50 rounded-lg border border-border">
            <div className="text-xs text-muted font-mono-digital">배치</div>
            <div className="font-digital font-bold text-accent">{decisions.length}</div>
          </div>
          <div className="p-1.5 bg-surface/50 rounded-lg border border-border">
            <div className="text-xs text-muted font-mono-digital">신뢰도</div>
            <div className="font-digital font-bold text-yellow-400">
              {decisions.length > 0
                ? Math.round(
                    decisions.reduce((sum, d) => sum + d.confidence, 0) /
                      decisions.length
                  )
                : 0}%
            </div>
          </div>
          <div className="p-1.5 bg-surface/50 rounded-lg border border-border">
            <div className="text-xs text-muted font-mono-digital">남은칸</div>
            <div className="font-digital font-bold text-primary">{20 - decisions.length}</div>
          </div>
        </div>
      </div>

      {/* 결정 목록 - 스크롤 가능, flex-1로 남은 공간 채움 */}
      {decisions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted">
          <div className="text-4xl mb-2">🤖</div>
          <p className="font-mono-digital text-sm text-center">숫자를 선택하면 AI가<br/>최적의 위치에 배치합니다</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {decisions.map((decision, idx) => (
            <div
              key={decision.timestamp}
              className={`p-3 rounded-lg border transition-all ${
                idx === 0
                  ? "bg-primary/10 border-primary/50"
                  : "bg-surface/50 border-border"
              }`}
            >
              {/* 상단: 숫자와 위치 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-digital font-bold text-lg ${
                      decision.number === "★"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                        : "bg-accent/20 text-accent border border-accent/50"
                    }`}
                  >
                    {decision.number}
                  </span>
                  <div>
                    <div className="text-xs text-muted font-mono-digital">배치 위치</div>
                    <div className="font-digital font-bold">{decision.index + 1}번 칸</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted font-mono-digital">신뢰도</div>
                  <div className={`font-digital font-bold ${getConfidenceColor(decision.confidence)}`}>
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

              {/* 목표 기대값: 이 수를 둔 뒤 예상되는 최종 점수 */}
              {decision.outlook && (
                <div className="mb-2 p-2 rounded-lg border border-border bg-surface/50">
                  <div className="text-xs text-muted font-mono-digital mb-1">목표 기대값 (예상 최종 점수)</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {([
                      ["보수", decision.outlook.low, "text-orange-400"],
                      ["중립", decision.outlook.mid, "text-yellow-400"],
                      ["긍정", decision.outlook.high, "text-green-400"],
                    ] as const).map(([label, value, color]) => (
                      <div key={label}>
                        <div className="text-xs text-muted font-mono-digital">{label}</div>
                        <div className={`font-digital font-bold text-xl ${color}`}>{value}점</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 전략 */}
              {decision.strategy && (
                <div className="mb-1">
                  <span className="px-2 py-0.5 text-xs font-digital bg-blue-500/20 text-blue-400 rounded">
                    {decision.strategy}
                  </span>
                </div>
              )}

              {/* 이유 */}
              <p className="text-sm font-mono-digital text-cyan-300 leading-relaxed">
                {decision.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
