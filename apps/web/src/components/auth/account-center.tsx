"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "../../lib/auth-client";
import type {
  AccountPasskeySummary,
  AccountSessionSummary,
} from "../../server/auth/account-service";

type AccountCenterProps = {
  user: {
    name?: string;
    email?: string;
    roles: Array<"vendor" | "organizer" | "admin">;
    activeRole?: "vendor" | "organizer" | "admin" | null;
  };
  passkeyCount?: number;
  sessionCount?: number;
  passkeys?: AccountPasskeySummary[];
  sessions?: AccountSessionSummary[];
};

export function AccountCenter({
  user,
  passkeyCount = 0,
  sessionCount = 0,
  passkeys = [],
  sessions = [],
}: AccountCenterProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState(user.activeRole ?? user.roles[0]);

  async function handleBindPasskey() {
    setStatus(null);
    setError(null);
    const result = await authClient.passkey.addPasskey({
      name: user.name ?? user.email ?? "Primary passkey",
    });

    if (result.error) {
      setError(result.error.message ?? "绑定 Passkey 失败，请稍后再试。");
      return;
    }

    setStatus("Passkey 已绑定。");
    router.refresh();
  }

  async function handleRoleChange(nextRole: "vendor" | "organizer" | "admin") {
    setStatus(null);
    setError(null);
    const response = await fetch("/api/auth/roles/active", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: nextRole }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({ message: "切换角色失败。" }))) as {
        message?: string;
      };
      setError(result.message ?? "切换角色失败。");
      return;
    }

    setActiveRole(nextRole);
    setStatus("当前角色已切换。");
    router.refresh();
  }

  async function handleRevokeOtherSessions() {
    setStatus(null);
    setError(null);
    const response = await fetch("/api/auth/sessions/revoke-other", {
      method: "POST",
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({ message: "退出其他设备失败。" }))) as {
        message?: string;
      };
      setError(result.message ?? "退出其他设备失败。");
      return;
    }

    setStatus("已退出其他设备。");
    router.refresh();
  }

  return (
    <section aria-label="账号中心内容">
      <p>{user.email ?? "未绑定邮箱"}</p>
      {status ? <p role="status">{status}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <h3>已绑定 Passkey</h3>
      <p>{passkeyCount} 个</p>
      {passkeys.length > 0 ? (
        <ul aria-label="Passkey 列表">
          {passkeys.map((passkey) => (
            <li key={passkey.id}>
              <p>{passkey.name}</p>
              {passkey.createdAtLabel ? <p>{passkey.createdAtLabel}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>暂无已绑定 Passkey。</p>
      )}
      <h3>设备会话</h3>
      <p>{sessionCount} 个</p>
      {sessions.length > 0 ? (
        <ul aria-label="设备会话列表">
          {sessions.map((session) => (
            <li key={session.id}>
              <p>{session.label}</p>
              {session.expiresAtLabel ? <p>{session.expiresAtLabel}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>暂无其他设备会话信息。</p>
      )}
      <label>
        当前角色
        <select
          aria-label="当前角色"
          value={activeRole ?? undefined}
          onChange={(event) =>
            void handleRoleChange(event.target.value as "vendor" | "organizer" | "admin")
          }
        >
          {user.roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => void handleBindPasskey()}>
        绑定 Passkey
      </button>
      <button type="button" onClick={() => void handleRevokeOtherSessions()}>
        退出其他设备
      </button>
    </section>
  );
}
