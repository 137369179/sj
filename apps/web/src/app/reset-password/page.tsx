import { ResetPasswordForm } from "../../components/auth/reset-password-form";
import { AppShell } from "../../components/layout/app-shell";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <AppShell>
      <main aria-labelledby="reset-password-title">
        <h2 id="reset-password-title">重置密码</h2>
        <ResetPasswordForm token={resolvedSearchParams.token} />
      </main>
    </AppShell>
  );
}
