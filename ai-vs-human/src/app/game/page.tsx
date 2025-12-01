"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import GameBoard from "@/components/GameBoard";
import ScoreTable from "@/components/ScoreTable";
import { Room, BOARD_SIZE } from "@/lib/types";
import { calculateScore } from "@/lib/ai-logic";

export default function GamePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [myBoard, setMyBoard] = useState<(number | "★" | null)[]>(Array(BOARD_SIZE).fill(null));
  const [myScore, setMyScore] = useState(0);
  const [waitingForPlacement, setWaitingForPlacement] = useState(false);
  const [lastPlacedIndex, setLastPlacedIndex] = useState<number | null>(null);

  // 사용자 확인
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));
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
    if (!currentRoom || !user) return;

    try {
      const res = await fetch(`/api/rooms?roomId=${currentRoom.id}`);
      const data = await res.json();
      if (data.success) {
        setCurrentRoom(data.room);

        // 내 보드 정보 업데이트
        const myParticipant = data.room.participants.find(
          (p: { id: string }) => p.id === user.id
        );
        if (myParticipant) {
          setMyBoard(myParticipant.board);
          setMyScore(myParticipant.score);
        }

        // 새 숫자가 나왔고 아직 배치 안했으면
        if (data.room.currentNumber !== null && myParticipant) {
          const placedCount = myParticipant.board.filter((c: number | "★" | null) => c !== null).length;
          const usedCount = data.room.usedNumbers.length;
          if (placedCount < usedCount) {
            setWaitingForPlacement(true);
          } else {
            setWaitingForPlacement(false);
          }
        } else {
          setWaitingForPlacement(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch room:", error);
    }
  }, [currentRoom, user]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  useEffect(() => {
    if (currentRoom) {
      const interval = setInterval(fetchCurrentRoom, 1000);
      return () => clearInterval(interval);
    }
  }, [currentRoom, fetchCurrentRoom]);

  // 방 참여
  const handleJoinRoom = async (room: Room) => {
    if (!user) return;

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          roomId: room.id,
          userId: user.id,
          username: user.username,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentRoom(room);
        if (data.participant) {
          setMyBoard(data.participant.board);
          setMyScore(data.participant.score);
        }
      } else {
        alert(data.error || "방 참여에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  // 숫자 배치
  const handlePlaceNumber = async (index: number) => {
    if (!currentRoom || !user || !waitingForPlacement) return;

    const number = currentRoom.currentNumber;
    if (number === null) return;

    // 로컬 상태 먼저 업데이트
    const newBoard = [...myBoard];
    newBoard[index] = number;
    setMyBoard(newBoard);
    setMyScore(calculateScore(newBoard));
    setLastPlacedIndex(index);
    setWaitingForPlacement(false);

    try {
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "placeParticipant",
          roomId: currentRoom.id,
          userId: user.id,
          index,
          number,
        }),
      });
    } catch (error) {
      console.error("Failed to place number:", error);
    }
  };

  // 방 나가기
  const handleLeaveRoom = async () => {
    if (!currentRoom || !user) return;

    try {
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "leave",
          roomId: currentRoom.id,
          userId: user.id,
        }),
      });
    } catch (error) {
      console.error("Failed to leave room:", error);
    }

    setCurrentRoom(null);
    setMyBoard(Array(BOARD_SIZE).fill(null));
    setMyScore(0);
  };

  // 로그아웃
  const handleLogout = () => {
    handleLeaveRoom();
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="AI vs 집단지성"
        username={user.username}
        onLogout={handleLogout}
      />

      <main className="flex-1 p-6">
        {!currentRoom ? (
          /* 방 목록 */
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-6 text-center">게임방 선택</h2>

            {rooms.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-2">대기 중인 게임이 없습니다</h3>
                <p className="text-muted">관리자가 게임을 시작할 때까지 기다려주세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-surface rounded-xl p-6 border border-border"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold">{room.name}</h3>
                        <p className="text-sm text-muted">
                          참가자: {room.participants.length}명
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-sm ${
                        room.status === "waiting" ? "bg-yellow-500/20 text-yellow-400" :
                        room.status === "playing" ? "bg-green-500/20 text-green-400" :
                        "bg-muted/20 text-muted"
                      }`}>
                        {room.status === "waiting" ? "대기중" : room.status === "playing" ? "진행중" : "완료"}
                      </span>
                    </div>

                    <button
                      onClick={() => handleJoinRoom(room)}
                      disabled={room.status === "finished"}
                      className="w-full py-3 bg-primary text-white rounded-lg font-bold
                        hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      참여하기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 게임 화면 */
          <div className="max-w-6xl mx-auto">
            {/* 상태 바 */}
            <div className="flex items-center justify-between mb-6 p-4 bg-surface rounded-xl border border-border">
              <div>
                <h2 className="font-bold">{currentRoom.name}</h2>
                <p className="text-sm text-muted">
                  라운드 {currentRoom.turn}/{BOARD_SIZE} · 참가자 {currentRoom.participants.length}명
                </p>
              </div>

              <div className="flex items-center gap-4">
                {currentRoom.currentNumber !== null && (
                  <div className="text-center">
                    <div className="text-xs text-muted">현재 숫자</div>
                    <div className="text-3xl font-bold text-accent">
                      {currentRoom.currentNumber}
                    </div>
                  </div>
                )}

                <span className={`px-3 py-1 rounded-lg text-sm ${
                  currentRoom.status === "waiting" ? "bg-yellow-500/20 text-yellow-400" :
                  currentRoom.status === "playing" ? "bg-green-500/20 text-green-400" :
                  "bg-blue-500/20 text-blue-400"
                }`}>
                  {currentRoom.status === "waiting" ? "대기중" : currentRoom.status === "playing" ? "진행중" : "완료"}
                </span>

                <button
                  onClick={handleLeaveRoom}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                >
                  나가기
                </button>
              </div>
            </div>

            {currentRoom.status === "waiting" ? (
              /* 대기 화면 */
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-2">게임 대기 중</h3>
                <p className="text-muted">호스트가 게임을 시작할 때까지 잠시만 기다려주세요.</p>
              </div>
            ) : (
              /* 게임 화면 */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 내 보드 */}
                <div className="lg:col-span-2">
                  {waitingForPlacement && (
                    <div className="mb-4 p-4 bg-accent/20 border border-accent/50 rounded-xl text-center animate-pulse">
                      <span className="text-accent font-bold">
                        🎯 숫자 {currentRoom.currentNumber}를 배치할 위치를 선택하세요!
                      </span>
                    </div>
                  )}

                  <GameBoard
                    board={myBoard}
                    teamName={user.username}
                    score={myScore}
                    highlightIndex={lastPlacedIndex ?? undefined}
                    isManualMode={waitingForPlacement}
                    onCellClick={handlePlaceNumber}
                  />
                </div>

                {/* 사이드바 */}
                <div className="space-y-4">
                  {/* 점수표 */}
                  <ScoreTable />

                  {/* AI vs 나 비교 */}
                  <div className="bg-surface rounded-xl p-4 border border-border">
                    <h3 className="font-bold mb-3">점수 비교</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                        <span>🤖 AI</span>
                        <span className="font-bold text-purple-400">{currentRoom.aiScore}점</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                        <span>👤 나</span>
                        <span className="font-bold text-accent">{myScore}점</span>
                      </div>
                      <div className="text-center pt-2 border-t border-border">
                        {myScore > currentRoom.aiScore ? (
                          <span className="text-accent">🎉 AI를 이기고 있습니다!</span>
                        ) : myScore < currentRoom.aiScore ? (
                          <span className="text-red-400">😅 AI에게 지고 있습니다</span>
                        ) : (
                          <span className="text-yellow-400">🤝 AI와 동점입니다</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
