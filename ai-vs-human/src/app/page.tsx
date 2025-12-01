"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if logged in
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      if (userData.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/game");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl text-primary mb-4">JJ CREATIVE 교육연구소</h1>
        <p className="text-muted">로딩 중...</p>
      </div>
    </main>
  );
}
