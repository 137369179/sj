import Link from "next/link";
import type { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="shell-header" aria-label="主导航">
        <Link href="/" className="brand">
          市集招募平台
        </Link>
        <nav className="shell-nav" aria-label="角色导航">
          <Link href="/markets">摊主端</Link>
          <Link href="/organizer/markets">主办方端</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
