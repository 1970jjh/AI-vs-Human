import { NextRequest, NextResponse } from "next/server";
import { login, registerUser, deleteUser, getAllUsers } from "@/lib/auth";

// POST /api/auth - 로그인
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username, password, role, userId } = body;

    if (action === "login") {
      const result = await login(username, password);
      return NextResponse.json(result);
    }

    if (action === "register") {
      const result = await registerUser(username, password, role || "member");
      return NextResponse.json(result);
    }

    if (action === "delete") {
      const result = await deleteUser(userId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "알 수 없는 작업입니다." });
  } catch (error) {
    console.error("Auth API error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// GET /api/auth - 회원 목록
export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Auth API error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
