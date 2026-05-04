import { ForgotPasswordForm } from "../../components/auth/forgot-password-form";
import { AppShell } from "../../components/layout/app-shell";

export default async function ForgotPasswordPage() {
  return (
    <AppShell>
      <main aria-labelledby="forgot-password-title">
        <h2 id="forgot-password-title">找回密码</h2>
        <ForgotPasswordForm />
      </main>
    </AppShell>
  );
}
