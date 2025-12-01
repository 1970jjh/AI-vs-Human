"use client";

interface HeaderProps {
  title?: string;
  isAdmin?: boolean;
  username?: string;
  onLogout?: () => void;
}

export default function Header({
  title = "AI vs 집단지성",
  isAdmin = false,
  username,
  onLogout,
}: HeaderProps) {
  return (
    <header className="w-full py-4 px-6 flex items-center justify-between border-b border-border">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">
          <span className="text-white">{title}</span>
          {isAdmin && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
              ADMIN
            </span>
          )}
        </h1>
        {username && (
          <span className="text-sm text-muted">COMPANY: {username}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-primary font-bold tracking-wider">
          JJ CREATIVE 교육연구소
        </span>
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            나가기
          </button>
        )}
      </div>
    </header>
  );
}
