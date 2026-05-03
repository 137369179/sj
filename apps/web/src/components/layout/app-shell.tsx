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

  return (
    <div className="app-shell">
      <header className="shell-header" aria-label="主导航">
        <Link href="/" className="brand">
          市集招募平台
        </Link>
        <nav className="shell-nav" aria-label="角色导航">
          <Link href="/markets">摊主端</Link>
          {sessionUser?.role === "vendor" && (
            <>
              <Link href="/applications">我的报名</Link>
              <Link href="/notifications">我的通知</Link>
            </>
          )}
          <Link href="/organizer/markets">主办方端</Link>
          {sessionUser?.role === "admin" && (
            <Link href="/admin/organizers">管理后台</Link>
          )}
        </nav>
        <AuthStatus sessionUser={sessionUser} />
      </header>
      {children}
    </div>
  );
}
