/**
 * 강사 휴대폰 리모컨 ↔ PC 대시보드 실시간 연결 (Supabase Realtime broadcast)
 *
 * 게임 상태의 주인은 PC 대시보드다. 휴대폰은 명령(cmd)만 보내고,
 * 대시보드가 실행한 뒤 바뀐 상태(state)를 방 전체에 알린다. DB 테이블은 쓰지 않는다.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Card = number | "★";

export interface RoomState {
  deck: Card[]; // 40칸 뒷면 숫자 (강사 휴대폰의 «뒷면 보기»용)
  revealed: boolean[];
  current: Card | null; // 공개됐지만 아직 배치 안 된 숫자
  processing: boolean;
  turn: number;
  score: number;
  finished: boolean;
  music: boolean;
  volume: number; // 0~10
}

export type RoomCommand =
  | { type: "hello" }
  | { type: "reveal"; index: number }
  | { type: "decide" }
  | { type: "reset" }
  | { type: "music" }
  | { type: "volume"; delta: number };

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE;
  if (!url || !key) {
    console.error("리모컨 연결 설정(NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE)이 없습니다.");
    return null;
  }
  if (!client) client = createClient(url, key);
  return client;
}

// 헷갈리는 글자(0/O, 1/I)를 뺀 6자리 방 코드
export function newRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function isRoomCode(code: string | null): code is string {
  return !!code && /^[A-Z2-9]{6}$/.test(code);
}

export function joinRoom(
  code: string,
  handlers: {
    onState?: (state: RoomState) => void;
    onCommand?: (cmd: RoomCommand) => void;
    onReady?: () => void; // 채널에 붙을 때마다(재연결 포함) 호출
  }
) {
  const supabase = getClient();
  if (!supabase) return { sendState: () => {}, sendCommand: () => {}, leave: () => {} };

  const channel = supabase.channel(`avh-room-${code}`, { config: { broadcast: { self: false } } });
  if (handlers.onState) channel.on("broadcast", { event: "state" }, ({ payload }) => handlers.onState?.(payload as RoomState));
  if (handlers.onCommand) channel.on("broadcast", { event: "cmd" }, ({ payload }) => handlers.onCommand?.(payload as RoomCommand));
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") handlers.onReady?.();
  });

  return {
    sendState: (state: RoomState) => { channel.send({ type: "broadcast", event: "state", payload: state }); },
    sendCommand: (cmd: RoomCommand) => { channel.send({ type: "broadcast", event: "cmd", payload: cmd }); },
    leave: () => { supabase.removeChannel(channel); },
  };
}
