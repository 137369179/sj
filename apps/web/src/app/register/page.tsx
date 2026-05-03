import { AppShell } from "../../components/layout/app-shell";
import { RegisterForm } from "../../components/auth/register-form";

export default async function RegisterPage() {
  return (
    <AppShell>
      <main aria-labelledby="register-title">
        <h2 id="register-title">注册</h2>
        <RegisterForm />
      </main>
    </AppShell>
  );
}
