import { NextRequest, NextResponse } from "next/server";
import {
  createRoom,
  getRoom,
  getRooms,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  drawNumber,
  selectNumber,
  updateParticipantBoard,
  updateAIBoard,
  nextTurn,
  startGame,
  resetGame,
  getActiveRooms,
} from "@/lib/rooms";
import { getAIBestMove } from "@/lib/gemini";
import { calculateScore } from "@/lib/ai-logic";

// GET /api/rooms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const active = searchParams.get("active");

    if (roomId) {
      const room = await getRoom(roomId);
      if (!room) {
        return NextResponse.json(
          { success: false, error: "방을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, room });
    }

    if (active === "true") {
      const rooms = await getActiveRooms();
      return NextResponse.json({ success: true, rooms });
    }

    const rooms = await getRooms();
    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    console.error("Rooms API error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/rooms
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, roomId, hostId, name, userId, username, index, number } = body;

    // 방 생성
    if (action === "create") {
      const room = await createRoom(hostId, name);
      return NextResponse.json({ success: true, room });
    }

    // 방 삭제
    if (action === "delete") {
      const result = await deleteRoom(roomId);
      return NextResponse.json({ success: result });
    }

    // 방 참여
    if (action === "join") {
      const result = await joinRoom(roomId, userId, username);
      return NextResponse.json(result);
    }

    // 방 나가기
    if (action === "leave") {
      const result = await leaveRoom(roomId, userId);
      return NextResponse.json({ success: result });
    }

    // 게임 시작
    if (action === "start") {
      const result = await startGame(roomId);
      return NextResponse.json(result);
    }

    // 게임 리셋
    if (action === "reset") {
      const result = await resetGame(roomId);
      return NextResponse.json(result);
    }

    // 숫자 뽑기 (랜덤)
    if (action === "draw") {
      const result = await drawNumber(roomId);
      return NextResponse.json(result);
    }

    // 숫자 선택 (직접)
    if (action === "select") {
      const result = await selectNumber(roomId, number);
      return NextResponse.json(result);
    }

    // 참가자 보드 업데이트
    if (action === "placeParticipant") {
      const result = await updateParticipantBoard(roomId, userId, index, number);

      // 점수 계산
      if (result.success) {
        const room = await getRoom(roomId);
        if (room) {
          const participant = room.participants.find((p) => p.id === userId);
          if (participant) {
            const score = calculateScore(participant.board);
            participant.score = score;
            await updateRoom(roomId, { participants: room.participants });
          }
        }
      }

      return NextResponse.json(result);
    }

    // AI 보드 업데이트 (자동)
    if (action === "placeAI") {
      const room = await getRoom(roomId);
      if (!room || room.currentNumber === null) {
        return NextResponse.json({ success: false, error: "현재 숫자가 없습니다." });
      }

      const remainingNumbers = room.deck.filter(
        (n) => !room.usedNumbers.includes(n) ||
        room.usedNumbers.filter((u) => u === n).length < room.deck.filter((d) => d === n).length
      );

      const aiResponse = await getAIBestMove(
        room.aiBoard,
        room.currentNumber,
        remainingNumbers
      );

      if (aiResponse.index === -1) {
        // 수동 모드 - 첫 번째 빈칸에 배치
        for (let i = 0; i < room.aiBoard.length; i++) {
          if (room.aiBoard[i] === null) {
            await updateAIBoard(roomId, i, room.currentNumber);
            break;
          }
        }
      } else {
        await updateAIBoard(roomId, aiResponse.index, room.currentNumber);
      }

      // 점수 계산
      const updatedRoom = await getRoom(roomId);
      if (updatedRoom) {
        const aiScore = calculateScore(updatedRoom.aiBoard);
        await updateRoom(roomId, { aiScore });
      }

      return NextResponse.json({ success: true, aiResponse });
    }

    // 다음 턴
    if (action === "nextTurn") {
      const result = await nextTurn(roomId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "알 수 없는 작업입니다." });
  } catch (error) {
    console.error("Rooms API error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
