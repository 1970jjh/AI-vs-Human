/**
 * 게임방 관리 시스템
 */

import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Room, Participant, BOARD_SIZE } from "./types";
import { createDeck, shuffleDeck } from "./ai-logic";

const DATA_DIR = path.join(process.cwd(), "data");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");

// 데이터 디렉토리 및 파일 초기화
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  try {
    await fs.access(ROOMS_FILE);
  } catch {
    await fs.writeFile(ROOMS_FILE, JSON.stringify([], null, 2));
  }
}

// 모든 방 가져오기
export async function getRooms(): Promise<Room[]> {
  await ensureDataDir();
  const data = await fs.readFile(ROOMS_FILE, "utf-8");
  return JSON.parse(data);
}

// 방 저장
export async function saveRooms(rooms: Room[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(ROOMS_FILE, JSON.stringify(rooms, null, 2));
}

// 방 생성 (관리자)
export async function createRoom(
  hostId: string,
  name: string
): Promise<Room> {
  const rooms = await getRooms();

  const deck = shuffleDeck(createDeck());

  const newRoom: Room = {
    id: uuidv4(),
    name,
    hostId,
    status: "waiting",
    currentNumber: null,
    turn: 0,
    deck,
    usedNumbers: [],
    aiBoard: Array(BOARD_SIZE).fill(null),
    aiScore: 0,
    participants: [],
    createdAt: Date.now(),
  };

  rooms.push(newRoom);
  await saveRooms(rooms);

  return newRoom;
}

// 방 조회
export async function getRoom(roomId: string): Promise<Room | null> {
  const rooms = await getRooms();
  return rooms.find((r) => r.id === roomId) || null;
}

// 방 업데이트
export async function updateRoom(
  roomId: string,
  updates: Partial<Room>
): Promise<Room | null> {
  const rooms = await getRooms();
  const index = rooms.findIndex((r) => r.id === roomId);

  if (index === -1) return null;

  rooms[index] = { ...rooms[index], ...updates };
  await saveRooms(rooms);

  return rooms[index];
}

// 방 삭제
export async function deleteRoom(roomId: string): Promise<boolean> {
  const rooms = await getRooms();
  const index = rooms.findIndex((r) => r.id === roomId);

  if (index === -1) return false;

  rooms.splice(index, 1);
  await saveRooms(rooms);

  return true;
}

// 방 참여
export async function joinRoom(
  roomId: string,
  oduserId: string,
  odusername: string
): Promise<{ success: boolean; participant?: Participant; error?: string }> {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { success: false, error: "방을 찾을 수 없습니다." };
  }

  if (room.status !== "waiting") {
    return { success: false, error: "이미 게임이 시작되었습니다." };
  }

  // 이미 참여한 경우
  const existing = room.participants.find((p) => p.id === oduserId);
  if (existing) {
    return { success: true, participant: existing };
  }

  const newParticipant: Participant = {
    id: oduserId,
    odusername,
    board: Array(BOARD_SIZE).fill(null),
    score: 0,
    joinedAt: Date.now(),
  };

  room.participants.push(newParticipant);
  await saveRooms(rooms);

  return { success: true, participant: newParticipant };
}

// 방 나가기
export async function leaveRoom(
  roomId: string,
  oduserId: string
): Promise<boolean> {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === roomId);

  if (!room) return false;

  const index = room.participants.findIndex((p) => p.id === oduserId);
  if (index === -1) return false;

  room.participants.splice(index, 1);
  await saveRooms(rooms);

  return true;
}

// 숫자 뽑기 (랜덤)
export async function drawNumber(
  roomId: string
): Promise<{ success: boolean; number?: number | "★"; error?: string }> {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { success: false, error: "방을 찾을 수 없습니다." };
  }

  if (room.turn >= BOARD_SIZE) {
    return { success: false, error: "모든 턴이 완료되었습니다." };
  }

  const number = room.deck[room.turn];
  room.currentNumber = number;
  room.usedNumbers.push(number);

  await saveRooms(rooms);

  return { success: true, number };
}

// 특정 숫자 선택
export async function selectNumber(
  roomId: string,
  number: number | "★"
): Promise<{ success: boolean; error?: string }> {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { success: false, error: "방을 찾을 수 없습니다." };
  }

  // 이미 사용된 숫자인지 확인
  const usedCount = room.usedNumbers.filter((n) => n === number).length;
  const deckCount = room.deck.filter((n) => n === number).length;

  if (usedCount >= deckCount) {
    return { success: false, error: "이 숫자는 이미 모두 사용되었습니다." };
  }

  room.currentNumber = number;
  room.usedNumbers.push(number);

  await saveRooms(rooms);

  return { success: true };
}

// 참가자 보드 업데이트
export async function updateParticipantBoard(
  roomId: string,
  oduserId: string,
  index: number,
  number: number | "★"
): Promise<{ success: boolean; error?: string }> {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { success: false, error: "방을 찾을 수 없습니다." };
  }

  const participant = room.participants.find((p) => p.id === oduserId);
  if (!participant) {
    return { success: false, error: "참가자를 찾을 수 없습니다." };
  }

  if (participant.board[index] !== null) {
    return { success: false, error: "이미 숫자가 배치된 위치입니다." };
  }

  participant.board[index] = number;

  await saveRooms(rooms);

  return { success: true };
}

// AI 보드 업데이트
export async function updateAIBoard(
  roomId: string,
  index: number,
  number: number | "★"
): Promise<{ success: boolean; error?: string }> {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { success: false, error: "방을 찾을 수 없습니다." };
  }

  if (room.aiBoard[index] !== null) {
    return { success: false, error: "이미 숫자가 배치된 위치입니다." };
  }

  room.aiBoard[index] = number;

  await saveRooms(rooms);

  return { success: true };
}

// 턴 증가
export async function nextTurn(roomId: string): Promise<{ success: boolean; turn?: number }> {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { success: false };
  }

  room.turn += 1;
  room.currentNumber = null;

  if (room.turn >= BOARD_SIZE) {
    room.status = "finished";
  }

  await saveRooms(rooms);

  return { success: true, turn: room.turn };
}

// 게임 시작
export async function startGame(roomId: string): Promise<{ success: boolean; error?: string }> {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { success: false, error: "방을 찾을 수 없습니다." };
  }

  room.status = "playing";
  await saveRooms(rooms);

  return { success: true };
}

// 게임 리셋
export async function resetGame(roomId: string): Promise<{ success: boolean; error?: string }> {
  const rooms = await getRooms();
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { success: false, error: "방을 찾을 수 없습니다." };
  }

  const deck = shuffleDeck(createDeck());

  room.status = "waiting";
  room.currentNumber = null;
  room.turn = 0;
  room.deck = deck;
  room.usedNumbers = [];
  room.aiBoard = Array(BOARD_SIZE).fill(null);
  room.aiScore = 0;
  room.participants.forEach((p) => {
    p.board = Array(BOARD_SIZE).fill(null);
    p.score = 0;
  });

  await saveRooms(rooms);

  return { success: true };
}

// 활성 방 목록 (대기중 또는 진행중)
export async function getActiveRooms(): Promise<Room[]> {
  const rooms = await getRooms();
  return rooms.filter((r) => r.status !== "finished");
}
