import { VerifyEmailCard } from "../../components/auth/verify-email-card";
import { AppShell } from "../../components/layout/app-shell";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <AppShell>
      <main aria-labelledby="verify-email-title">
        <h2 id="verify-email-title">验证邮箱</h2>
        <VerifyEmailCard email={resolvedSearchParams.email} />
      </main>
    </AppShell>
  );
}
