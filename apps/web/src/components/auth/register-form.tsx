"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "vendor"),
    };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => ({ message: "注册失败，请稍后再试。" }))) as {
        message?: string;
      };
      setError(result.message ?? "注册失败，请稍后再试。");
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(payload.email)}`);
  }

  return (
    <form aria-label="注册表单" onSubmit={handleSubmit}>
      <p>创建统一账号后，你可以先以摊主或主办方身份进入平台，后续再扩展更多角色能力。</p>
      {error ? <p role="alert">{error}</p> : null}
      <label>
        姓名
        <input name="name" type="text" required minLength={2} />
      </label>
      <label>
        邮箱
        <input name="email" type="email" required />
      </label>
      <label>
        密码
        <input name="password" type="password" required minLength={8} />
      </label>
      <label>
        角色
        <select name="role" defaultValue="vendor" required>
          <option value="vendor">摊主</option>
          <option value="organizer">主办方</option>
        </select>
      </label>
      <button type="submit" disabled={submitting}>
        创建账号
      </button>
    </form>
  );
}
