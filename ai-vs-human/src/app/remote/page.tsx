"use client";

// 강사 휴대폰 리모컨: 번호판 40칸 + 뒷면 보기 + AI 결정 / 리셋 / 음악
import { useEffect, useRef, useState } from "react";
import { ADMIN_PASSWORD } from "@/lib/types";
import { isRoomCode, joinRoom, RoomState, RoomCommand } from "@/lib/room";

const PASS_KEY = "avh-remote-pass";

function coverLabel(index: number): string {
  return `${String.fromCharCode(65 + Math.floor(index / 5))}${(index % 5) + 1}`;
}

export default function RemotePage() {
  const [room, setRoom] = useState<string | null>(null);
  const [roomChecked, setRoomChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState(false);
  const [state, setState] = useState<RoomState | null>(null);
  const [peek, setPeek] = useState(false);
  const sendRef = useRef<(cmd: RoomCommand) => void>(() => {});

  // 주소의 ?room=코드 읽기, 이 휴대폰에서 이미 인증했으면 통과
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("room");
    setRoom(isRoomCode(code) ? code : null);
    setRoomChecked(true);
    if (localStorage.getItem(PASS_KEY) === ADMIN_PASSWORD) setAuthed(true);
  }, []);

  // 방 접속: 상태가 올 때까지 3초마다 인사(hello)를 보낸다
  useEffect(() => {
    if (!room || !authed) return;
    let gotState = false;
    const conn = joinRoom(room, {
      onState: (s) => { gotState = true; setState(s); },
      onReady: () => conn.sendCommand({ type: "hello" }),
    });
    sendRef.current = conn.sendCommand;
    const retry = setInterval(() => { if (!gotState) conn.sendCommand({ type: "hello" }); }, 3000);
    // 화면이 다시 켜지면 최신 상태를 다시 받는다
    const onVisible = () => { if (document.visibilityState === "visible") conn.sendCommand({ type: "hello" }); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(retry);
      document.removeEventListener("visibilitychange", onVisible);
      conn.leave();
    };
  }, [room, authed]);

  const shell = "min-h-[100dvh] flex flex-col p-3 gap-3";
  const bg = { backgroundColor: "var(--background)", color: "var(--text)" };

  if (!roomChecked) return <div className={shell} style={bg} />;

  if (!room) {
    return (
      <div className={`${shell} items-center justify-center text-center`} style={bg}>
        <p className="font-digital text-xl">방 주소가 올바르지 않습니다</p>
        <p className="font-mono-digital text-sm text-muted">PC 화면의 «📱 리모컨» QR을 다시 찍어 주세요.</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <form
        className={`${shell} items-center justify-center`}
        style={bg}
        onSubmit={(e) => {
          e.preventDefault();
          if (pass === ADMIN_PASSWORD) {
            localStorage.setItem(PASS_KEY, pass);
            setAuthed(true);
          } else {
            setPassError(true);
            setPass("");
          }
        }}
      >
        <p className="font-digital text-xl">강사 리모컨 · 방 {room}</p>
        <input
          type="password"
          inputMode="numeric"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="관리자 비밀번호"
          autoFocus
          className="w-full max-w-xs px-4 py-3 rounded-lg border text-center text-lg font-mono-digital"
          style={{ backgroundColor: "var(--surface)", borderColor: passError ? "#ef4444" : "var(--border)", color: "var(--text)" }}
        />
        {passError && <p className="text-red-400 text-sm font-mono-digital">비밀번호가 올바르지 않습니다</p>}
        <button type="submit" className="w-full max-w-xs py-3 rounded-lg font-digital font-bold text-lg bg-gradient-to-r from-purple-500 to-cyan-500 text-white">
          입장하기
        </button>
      </form>
    );
  }

  if (!state) {
    return (
      <div className={`${shell} items-center justify-center text-center`} style={bg}>
        <p className="font-digital text-xl animate-pulse">PC 화면에 연결하는 중...</p>
        <p className="font-mono-digital text-sm text-muted">방 {room} · PC에서 게임 화면이 열려 있어야 합니다.</p>
      </div>
    );
  }

  const send = (cmd: RoomCommand) => sendRef.current(cmd);
  const canPick = !state.finished && !state.processing && state.current === null;
  const canDecide = state.current !== null && !state.processing;
  const status = state.finished
    ? `게임 완료 · ${state.score}점`
    : state.processing
      ? "AI 분석 중..."
      : state.current !== null
        ? `출제: ${state.current} → AI 결정을 누르세요`
        : "숫자 칸을 누르세요";

  return (
    <div className={`${shell} h-[100dvh]`} style={bg}>
      {/* 상단: 상태 + 뒷면 보기 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="font-mono-digital text-xs text-muted">방 {room} · {state.turn}/20 · {state.score}점</div>
          <div className="font-digital font-bold text-base truncate">{status}</div>
        </div>
        <button
          onClick={() => setPeek(!peek)}
          aria-pressed={peek}
          className={`px-4 py-2 rounded-xl border-2 font-digital text-sm font-bold ${
            peek ? "bg-purple-500/40 border-purple-400 text-white" : "border-border text-muted"
          }`}
        >
          👁 뒷면 {peek ? "ON" : "OFF"}
        </button>
      </div>

      {/* 번호판 40칸 */}
      <div className="grid grid-cols-5 grid-rows-8 gap-1.5 flex-1 min-h-0">
        {state.deck.map((card, i) => {
          const open = state.revealed[i];
          return (
            <button
              key={i}
              disabled={open || !canPick}
              onClick={() => send({ type: "reveal", index: i })}
              className={`relative rounded-lg font-digital font-black flex items-center justify-center text-white text-2xl border ${
                open
                  ? `bg-gradient-to-br from-emerald-500/40 to-teal-500/40 border-emerald-400/60 ${peek ? "opacity-40" : ""}`
                  : peek
                    ? "bg-white/5 border-white/20"
                    : "bg-gradient-to-br from-indigo-500/80 via-purple-500/70 to-pink-500/80 border-indigo-300/40"
              } ${!open && canPick ? "active:scale-95" : ""}`}
            >
              {peek && <span className="absolute top-0.5 left-1 text-[10px] font-bold text-purple-300">{coverLabel(i)}</span>}
              {open || peek ? card : coverLabel(i)}
            </button>
          );
        })}
      </div>

      {/* 하단: AI 결정 + 리셋 / 음악 */}
      <button
        disabled={!canDecide}
        onClick={() => send({ type: "decide" })}
        className={`flex-shrink-0 py-4 rounded-2xl font-digital font-bold text-xl ${
          canDecide ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse" : "border border-border text-muted opacity-50"
        }`}
      >
        🤖 AI 결정
      </button>
      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        <button
          onClick={() => { if (window.confirm("새 게임으로 리셋할까요?")) send({ type: "reset" }); }}
          className="py-3 rounded-xl bg-red-500/20 text-red-400 font-digital font-bold"
        >
          리셋
        </button>
        <button
          onClick={() => send({ type: "music" })}
          className={`py-3 rounded-xl font-digital font-bold border ${
            state.music ? "bg-pink-500/20 text-pink-400 border-pink-500/50" : "text-muted border-border"
          }`}
        >
          🎵 Music {state.music ? "ON" : "OFF"}
        </button>
      </div>
      {/* 음량: 배경음악·효과음 공통 */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 flex-shrink-0">
        <button
          onClick={() => send({ type: "volume", delta: -1 })}
          disabled={state.volume <= 0}
          className="py-3 rounded-xl border border-border font-digital font-bold disabled:opacity-30"
        >
          🔉 소리 −
        </button>
        <span className="font-digital font-bold text-lg w-14 text-center">{state.volume}</span>
        <button
          onClick={() => send({ type: "volume", delta: 1 })}
          disabled={state.volume >= 10}
          className="py-3 rounded-xl border border-border font-digital font-bold disabled:opacity-30"
        >
          🔊 소리 +
        </button>
      </div>
    </div>
  );
}
