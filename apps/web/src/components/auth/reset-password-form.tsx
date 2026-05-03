"use client";

import { useState } from "react";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({ message: "重置失败，请稍后再试。" }))) as {
        message?: string;
      };
      setError(result.message ?? "重置失败，请稍后再试。");
      return;
    }

    setSuccess(true);
  }

  return (
    <form aria-label="重置密码表单" onSubmit={handleSubmit}>
      {success ? <p role="status">密码已更新，你现在可以返回登录页继续登录。</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <label>
        新密码
        <input name="newPassword" type="password" required minLength={8} />
      </label>
      <button type="submit">更新密码</button>
    </form>
  );
}
