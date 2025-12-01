/**
 * JSON 기반 간단한 인증 시스템
 */

import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

export interface StoredUser {
  id: string;
  username: string;
  password: string;
  role: "admin" | "member";
  createdAt: number;
}

// 초기 사용자 데이터
const initialUsers: StoredUser[] = [
  {
    id: "admin-001",
    username: "admin",
    password: "admin123",
    role: "admin",
    createdAt: Date.now(),
  },
];

// 데이터 디렉토리 및 파일 초기화
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2));
  }
}

// 모든 사용자 가져오기
export async function getUsers(): Promise<StoredUser[]> {
  await ensureDataDir();
  const data = await fs.readFile(USERS_FILE, "utf-8");
  return JSON.parse(data);
}

// 사용자 저장
export async function saveUsers(users: StoredUser[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// 로그인
export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; user?: Omit<StoredUser, "password">; error?: string }> {
  const users = await getUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  }

  return { success: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
}

// 회원 등록 (관리자만)
export async function registerUser(
  username: string,
  password: string,
  role: "admin" | "member" = "member"
): Promise<{ success: boolean; user?: Omit<StoredUser, "password">; error?: string }> {
  const users = await getUsers();

  if (users.some((u) => u.username === username)) {
    return { success: false, error: "이미 존재하는 사용자입니다." };
  }

  const newUser: StoredUser = {
    id: uuidv4(),
    username,
    password,
    role,
    createdAt: Date.now(),
  };

  users.push(newUser);
  await saveUsers(users);

  const { password: _, ...userWithoutPassword } = newUser;
  return { success: true, user: userWithoutPassword };
}

// 회원 삭제 (관리자만)
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === userId);

  if (index === -1) {
    return { success: false, error: "사용자를 찾을 수 없습니다." };
  }

  if (users[index].role === "admin") {
    const adminCount = users.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      return { success: false, error: "마지막 관리자는 삭제할 수 없습니다." };
    }
  }

  users.splice(index, 1);
  await saveUsers(users);

  return { success: true };
}

// 모든 회원 목록 (비밀번호 제외)
export async function getAllUsers(): Promise<Omit<StoredUser, "password">[]> {
  const users = await getUsers();
  return users.map(({ password: _, ...user }) => user);
}
