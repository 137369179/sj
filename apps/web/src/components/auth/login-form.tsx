"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { authClient } from "../../lib/auth-client";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "登录信息无效，请检查邮箱和密码后重试。",
  invalid_credentials: "邮箱或密码错误，请重新输入。",
  email_not_verified: "邮箱尚未验证，请先完成邮箱验证。",
  service_unavailable: "登录服务暂时不可用，请稍后再试。",
};

function resolveLoginErrorMessage(message: string | undefined) {
  if (!message) {
    return "登录失败，请稍后重试。";
  }

  const normalizedMessage = message.trim().toLowerCase().replace(/\s+/g, "_");
  return LOGIN_ERROR_MESSAGES[normalizedMessage] ?? message;
}

export function LoginForm({
  initialError,
  returnTo,
}: {
  initialError?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialMessage = useMemo(
    () => (initialError ? LOGIN_ERROR_MESSAGES[initialError] ?? "登录失败，请稍后重试。" : null),
    [initialError],
  );

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
    });

    setSubmitting(false);

        if (!response.ok) {
          const result = (await response.json().catch(() => ({ message: "登录失败，请稍后重试。" }))) as {
            message?: string;
          };
          setError(resolveLoginErrorMessage(result.message));
      return;
    }

    router.push(returnTo ?? "/");
    router.refresh();
  }

  async function handlePasskeyLogin() {
    setSubmitting(true);
    setError(null);

    const result = await authClient.signIn.passkey({
      autoFill: true,
    });

    setSubmitting(false);

    if (result.error) {
          setError(result.error.message ?? "Passkey 登录失败，请稍后重试。");
      return;
    }

        await fetch("/api/auth/session-sync", {
          method: "POST",
        });

    router.push(returnTo ?? "/");
    router.refresh();
  }

  return (
    <form aria-label="登录表单" onSubmit={handlePasswordLogin}>
      <p>使用邮箱密码登录，或直接使用 Passkey 完成无密码登录。</p>
      {initialMessage ? <p role="alert">{initialMessage}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <label>
        邮箱
        <input
          autoComplete="username webauthn"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        密码
        <input
          autoComplete="current-password webauthn"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <button type="submit" disabled={submitting}>
        密码登录
      </button>
      <button type="button" disabled={submitting} onClick={handlePasskeyLogin}>
        使用 Passkey 登录
      </button>
    </form>
  );
}
