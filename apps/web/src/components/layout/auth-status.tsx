"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthStatus({
  sessionUser
}: {
  sessionUser: {
    userId: string;
    role: "vendor" | "organizer" | "admin" | null;
    activeRole?: "vendor" | "organizer" | "admin" | null;
    name?: string;
  } | null;
}) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentRole = sessionUser?.activeRole ?? sessionUser?.role ?? null;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
    }
  }

  if (sessionUser) {
    return (
      <div className="auth-status" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <span aria-label="当前用户">
          {currentRole === "admin" ? "平台管理员" : currentRole === "organizer" ? "主办方" : "摊主"}:{" "}
          {sessionUser.name ?? sessionUser.userId}
        </span>
        <button onClick={() => router.push("/account")}>账号中心</button>
        <button onClick={handleLogout} disabled={isLoggingOut}>
          退出登录
        </button>
      </div>
    );
  }

  return (
    <div className="auth-status">
      <button onClick={() => router.push("/login")}>登录</button>
    </div>
  );
}
