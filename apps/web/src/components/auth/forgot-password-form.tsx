"use client";

import { useState } from "react";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({ message: "发送失败，请稍后再试。" }))) as {
        message?: string;
      };
      setError(result.message ?? "发送失败，请稍后再试。");
      return;
    }

    setSubmitted(true);
  }

  return (
    <form aria-label="找回密码表单" onSubmit={handleSubmit}>
      <p>输入你的注册邮箱，我们会发送一封带有重置链接的邮件。</p>
      {submitted ? <p role="status">如果该邮箱已注册，我们已发送重置链接。</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <label>
        邮箱
        <input name="email" type="email" required />
      </label>
      <button type="submit">发送重置链接</button>
    </form>
  );
}
