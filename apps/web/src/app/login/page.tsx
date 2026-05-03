import { redirect } from "next/navigation";

import { LoginForm } from "../../components/auth/login-form";
import { AppShell } from "../../components/layout/app-shell";
import { getSessionUser } from "../../lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ returnTo?: string; error?: string }>;
}) {
  const sessionUser = await getSessionUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  
  if (sessionUser) {
    redirect(resolvedSearchParams.returnTo ?? "/");
  }

  return (
    <AppShell>
      <main aria-labelledby="login-title">
        <h2 id="login-title">登录</h2>
        <LoginForm
          initialError={resolvedSearchParams.error}
          returnTo={resolvedSearchParams.returnTo}
        />
      </main>
    </AppShell>
  );
}
