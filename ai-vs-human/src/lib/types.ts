export interface User {
  id: string;
  username: string;
  role: "admin" | "member";
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  status: "waiting" | "playing" | "finished";
  currentNumber: number | "★" | null;
  turn: number;
  deck: (number | "★")[];
  usedNumbers: (number | "★")[];
  aiBoard: (number | "★" | null)[];
  aiScore: number;
  participants: Participant[];
  createdAt: number;
}

export interface Participant {
  id: string;
  odusername: string;
  board: (number | "★" | null)[];
  score: number;
  joinedAt: number;
}

export interface GameState {
  board: (number | "★" | null)[];
  score: number;
  turn: number;
}

export const BOARD_SIZE = 20;

export const SCORE_TABLE = [
  0, 0, 1, 3, 5, 7, 9, 11, 15, 20, 25, 30, 35, 40, 50, 60, 70, 85, 100, 150, 300,
];

export const BOARD_MAP = [
  { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 4 }, { r: 1, c: 5 }, { r: 1, c: 6 }, { r: 1, c: 7 }, { r: 1, c: 8 },
  { r: 2, c: 8 },
  { r: 3, c: 8 },
  { r: 4, c: 8 },
  { r: 5, c: 8 },
  { r: 5, c: 7 }, { r: 5, c: 6 }, { r: 5, c: 5 }, { r: 5, c: 4 }, { r: 5, c: 3 }, { r: 5, c: 2 }, { r: 5, c: 1 }, { r: 5, c: 0 },
];
