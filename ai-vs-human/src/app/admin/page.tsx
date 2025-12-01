"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import GameBoard from "@/components/GameBoard";
import NumberPanel from "@/components/NumberPanel";
import ScoreTable from "@/components/ScoreTable";
import RankingList from "@/components/RankingList";
import { Room, BOARD_SIZE } from "@/lib/types";

type TabType = "control" | "ranking";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("control");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [loading, setLoading] = useState(false);

  // 사용자 확인
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(userData);
    if (parsed.role !== "admin") {
      router.push("/game");
      return;
    }

    setUser(parsed);
  }, [router]);

  // 방 목록 가져오기
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms?active=true");
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  }, []);

  // 현재 방 정보 가져오기
  const fetchCurrentRoom = useCallback(async () => {
    if (!currentRoom) return;

    try {
      const res = await fetch(`/api/rooms?roomId=${currentRoom.id}`);
      const data = await res.json();
      if (data.success) {
        setCurrentRoom(data.room);
      }
    } catch (error) {
      console.error("Failed to fetch room:", error);
    }
  }, [currentRoom]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  useEffect(() => {
    if (currentRoom) {
      const interval = setInterval(fetchCurrentRoom, 2000);
      return () => clearInterval(interval);
    }
  }, [currentRoom, fetchCurrentRoom]);

  // 방 생성
  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !user) return;

    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          hostId: user.id,
          name: newRoomName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentRoom(data.room);
        setNewRoomName("");
        fetchRooms();
      }
    } catch (error) {
      console.error("Failed to create room:", error);
    } finally {
      setLoading(false);
    }
  };

  // 게임 시작
  const handleStartGame = async () => {
    if (!currentRoom) return;

    setLoading(true);
    try {
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", roomId: currentRoom.id }),
      });
      fetchCurrentRoom();
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setLoading(false);
    }
  };

  // 숫자 선택 (직접)
  const handleSelectNumber = async (number: number | "★") => {
    if (!currentRoom || currentRoom.status !== "playing") return;

    setLoading(true);
    try {
      // 숫자 선택
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", roomId: currentRoom.id, number }),
      });

      // AI 자동 배치
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "placeAI", roomId: currentRoom.id }),
      });

      fetchCurrentRoom();
    } catch (error) {
      console.error("Failed to select number:", error);
    } finally {
      setLoading(false);
    }
  };

  // 랜덤 선택
  const handleRandomSelect = async () => {
    if (!currentRoom || currentRoom.status !== "playing") return;

    setLoading(true);
    try {
      // 사용 가능한 숫자들 중에서 랜덤 선택
      const availableNumbers: (number | "★")[] = [];
      const deck = currentRoom.deck;
      const used = currentRoom.usedNumbers;

      for (const num of deck) {
        const deckCount = deck.filter((n) => n === num).length;
        const usedCount = used.filter((n) => n === num).length;
        if (usedCount < deckCount && !availableNumbers.includes(num)) {
          availableNumbers.push(num);
        }
      }

      if (availableNumbers.length > 0) {
        const randomNum = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
        await handleSelectNumber(randomNum);
      }
    } catch (error) {
      console.error("Failed to random select:", error);
    } finally {
      setLoading(false);
    }
  };

  // 다음 턴
  const handleNextTurn = async () => {
    if (!currentRoom) return;

    setLoading(true);
    try {
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nextTurn", roomId: currentRoom.id }),
      });
      fetchCurrentRoom();
    } catch (error) {
      console.error("Failed to next turn:", error);
    } finally {
      setLoading(false);
    }
  };

  // 게임 리셋
  const handleResetGame = async () => {
    if (!currentRoom) return;

    if (!confirm("정말로 게임을 리셋하시겠습니까?")) return;

    setLoading(true);
    try {
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", roomId: currentRoom.id }),
      });
      fetchCurrentRoom();
    } catch (error) {
      console.error("Failed to reset game:", error);
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="AI vs 집단지성"
        isAdmin
        username={user.username}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex">
        {/* 왼쪽 패널 */}
        <div className="w-96 p-4 border-r border-border flex flex-col gap-4">
          {/* 탭 */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setActiveTab("control")}
              className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 transition-colors
                ${activeTab === "control" ? "bg-primary text-white" : "bg-surface hover:bg-surface/80"}`}
            >
              <span>🎮</span>
              <span>컨트롤</span>
            </button>
            <button
              onClick={() => setActiveTab("ranking")}
              className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 transition-colors
                ${activeTab === "ranking" ? "bg-primary text-white" : "bg-surface hover:bg-surface/80"}`}
            >
              <span>🏆</span>
              <span>순위</span>
            </button>
          </div>

          {activeTab === "control" ? (
            <>
              {/* 방 생성/선택 */}
              {!currentRoom && (
                <div className="bg-surface rounded-xl p-4 border border-border">
                  <h3 className="font-bold mb-3">게임방 생성</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="방 이름"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg"
                    />
                    <button
                      onClick={handleCreateRoom}
                      disabled={loading || !newRoomName.trim()}
                      className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                    >
                      생성
                    </button>
                  </div>

                  {rooms.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm text-muted mb-2">기존 방 목록</h4>
                      <div className="space-y-2">
                        {rooms.map((room) => (
                          <button
                            key={room.id}
                            onClick={() => setCurrentRoom(room)}
                            className="w-full p-3 bg-surface/50 rounded-lg text-left hover:bg-surface transition-colors"
                          >
                            <div className="font-medium">{room.name}</div>
                            <div className="text-xs text-muted">
                              {room.status === "waiting" ? "대기중" : room.status === "playing" ? "진행중" : "완료"}
                              {" · "}
                              {room.participants.length}명 참가
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 게임 컨트롤 */}
              {currentRoom && (
                <>
                  <div className="bg-surface rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">{currentRoom.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        currentRoom.status === "waiting" ? "bg-yellow-500/20 text-yellow-400" :
                        currentRoom.status === "playing" ? "bg-green-500/20 text-green-400" :
                        "bg-muted/20 text-muted"
                      }`}>
                        {currentRoom.status === "waiting" ? "대기중" : currentRoom.status === "playing" ? "진행중" : "완료"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-muted">
                        라운드: {currentRoom.turn}/{BOARD_SIZE}
                      </span>
                      <span className="text-muted">
                        참가팀: {currentRoom.participants.length}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {currentRoom.status === "waiting" && (
                        <button
                          onClick={handleStartGame}
                          disabled={loading}
                          className="flex-1 py-2 bg-accent text-black rounded-lg font-bold disabled:opacity-50"
                        >
                          게임 시작
                        </button>
                      )}
                      {currentRoom.status === "playing" && currentRoom.currentNumber !== null && (
                        <button
                          onClick={handleNextTurn}
                          disabled={loading}
                          className="flex-1 py-2 bg-primary text-white rounded-lg font-bold disabled:opacity-50"
                        >
                          다음 턴
                        </button>
                      )}
                      <button
                        onClick={handleResetGame}
                        disabled={loading}
                        className="py-2 px-4 bg-red-500/20 text-red-400 rounded-lg disabled:opacity-50"
                      >
                        리셋
                      </button>
                    </div>
                  </div>

                  {/* 숫자 선택 패널 */}
                  <NumberPanel
                    usedNumbers={currentRoom.usedNumbers}
                    currentNumber={currentRoom.currentNumber}
                    onSelectNumber={handleSelectNumber}
                    onRandomSelect={handleRandomSelect}
                    isAdmin
                    disabled={loading || currentRoom.status !== "playing" || currentRoom.currentNumber !== null}
                  />

                  <ScoreTable />
                </>
              )}
            </>
          ) : (
            /* 순위 탭 */
            currentRoom && (
              <RankingList
                participants={currentRoom.participants}
                maxDisplay={10}
              />
            )
          )}
        </div>

        {/* 오른쪽 패널 - 보드 현황 */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-primary">📊</span>
              실시간 보드 현황
              <span className="text-sm text-muted">(상위 8개 팀 표시)</span>
            </h2>

            {currentRoom && (
              <div className="flex items-center gap-4 text-sm">
                <span>라운드 <span className="text-accent font-bold">{currentRoom.turn}/{BOARD_SIZE}</span></span>
                <span>참가 팀 <span className="text-accent font-bold">{currentRoom.participants.length}</span></span>
                <span className={`px-2 py-1 rounded ${
                  currentRoom.status === "waiting" ? "bg-yellow-500/20 text-yellow-400" :
                  currentRoom.status === "playing" ? "bg-green-500/20 text-green-400" :
                  "bg-blue-500/20 text-blue-400"
                }`}>
                  {currentRoom.status === "waiting" ? "대기중" : currentRoom.status === "playing" ? "진행중" : "완료"}
                </span>
              </div>
            )}
          </div>

          {!currentRoom ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-2">게임 대기 중</h3>
                <p className="text-muted">게임방을 생성하거나 선택하세요</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* AI 보드 (항상 첫 번째) */}
              <div className="lg:col-span-2 xl:col-span-1">
                <GameBoard
                  board={currentRoom.aiBoard}
                  teamName="AI"
                  score={currentRoom.aiScore}
                  showPlacementMarker
                />
              </div>

              {/* 참가자 보드들 (점수순 상위 5명) */}
              {[...currentRoom.participants]
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map((participant, idx) => (
                  <GameBoard
                    key={participant.id}
                    board={participant.board}
                    teamName={participant.odusername}
                    teamNumber={idx + 1}
                    memberCount={1}
                    score={participant.score}
                    compact
                  />
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
