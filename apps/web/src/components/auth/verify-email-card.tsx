"use client";

import { useState } from "react";

export function VerifyEmailCard({ email }: { email?: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;

    setStatus(null);
    setError(null);

    const response = await fetch("/api/auth/send-verification-email", {
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

    setStatus("验证邮件已重新发送，请注意查收。");
  }

  return (
    <section aria-label="邮箱验证状态">
      <p>{email ? `我们已经向 ${email} 发送了验证邮件。` : "请检查邮箱中的验证邮件。"}</p>
      {status ? <p role="status">{status}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <button type="button" onClick={handleResend}>重新发送验证邮件</button>
    </section>
  );
}
