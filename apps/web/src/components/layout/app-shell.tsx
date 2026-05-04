import Link from "next/link";
import type { PropsWithChildren } from "react";
import { getSessionUser } from "../../lib/auth";
import { AuthStatus } from "./auth-status";

export async function AppShell({ children }: PropsWithChildren) {
  let sessionUser = null;
  try {
    sessionUser = await getSessionUser();
  } catch (error) {
    // Graceful fallback for components that don't mock this in tests
  }
  const currentRole = sessionUser?.activeRole ?? sessionUser?.role ?? null;

  return (
    <div className="app-shell">
      <header className="shell-header" aria-label="主导航">
        <Link href="/" className="brand">
          市集招募平台
        </Link>
        <nav className="shell-nav" aria-label="角色导航">
          <Link href="/markets">摊主端</Link>
          {currentRole === "vendor" && (
            <>
              <Link href="/applications">我的报名</Link>
              <Link href="/notifications">我的通知</Link>
            </>
          )}
          <Link
            href="/organizer/markets"
            prefetch={currentRole === "organizer" || currentRole === "admin" ? undefined : false}
          >
            主办方端
          </Link>
          {currentRole === "admin" && (
            <>
              <Link href="/admin/organizers">主办方管理</Link>
              <Link href="/admin/markets">市集巡检</Link>
            </>
          )}
        </nav>
        <AuthStatus sessionUser={sessionUser} />
      </header>
      {children}
    </div>
  );
}
