import { redirect } from "next/navigation";

import { AccountCenter } from "../../components/auth/account-center";
import { AppShell } from "../../components/layout/app-shell";
import { getSessionUser } from "../../lib/auth";
import { listAccountPasskeys, listAccountSessions } from "../../server/auth/account-service";

export default async function AccountPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login?returnTo=%2Faccount");
  }

  const [sessions, passkeys] = await Promise.all([
    listAccountSessions().catch(() => []),
    listAccountPasskeys().catch(() => []),
  ]);

  return (
    <AppShell>
      <main aria-labelledby="account-title">
        <h2 id="account-title">账号中心</h2>
        <AccountCenter
          user={{
            name: sessionUser.name,
            email: sessionUser.email,
            roles: (sessionUser.roles ?? []).filter(
              (role): role is "vendor" | "organizer" | "admin" => role === "vendor" || role === "organizer" || role === "admin",
            ),
            activeRole: sessionUser.activeRole ?? sessionUser.role,
          }}
          passkeyCount={passkeys.length}
          passkeys={passkeys}
          sessionCount={sessions.length}
          sessions={sessions}
        />
      </main>
    </AppShell>
  );
}
