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

const ROLE_LABELS: Record<"vendor" | "organizer" | "admin", string> = {
  vendor: "摊主",
  organizer: "主办方",
  admin: "平台管理员",
};

const ROLE_GUIDANCE: Record<"vendor" | "organizer" | "admin", string> = {
  vendor: "可浏览市集、提交报名并跟进自己的入驻进度。",
  organizer: "可发布市集、管理摊位与处理报名申请。",
  admin: "可管理平台组织者、巡检全站数据并处理高权限事务。",
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
  const [passkeyDraftNames, setPasskeyDraftNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(passkeys.map((passkey) => [passkey.id, passkey.name])),
  );
  const unavailableRoles = (["vendor", "organizer", "admin"] as const).filter(
    (role) => !user.roles.includes(role),
  );
  const securityTips = [
    passkeyCount === 0 ? "建议尽快绑定至少 1 个 Passkey，减少密码泄露后的账号风险。" : null,
    sessionCount > 1 ? "当前账号存在多个设备会话，建议检查并撤销不再使用的设备。" : null,
  ].filter((tip): tip is string => tip !== null);

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

  async function handleDeletePasskey(passkeyId: string) {
    setStatus(null);
    setError(null);
    const response = await fetch(`/api/auth/passkeys/${passkeyId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({ message: "删除 Passkey 失败。" }))) as {
        message?: string;
      };
      setError(result.message ?? "删除 Passkey 失败。");
      return;
    }

    setStatus("Passkey 已删除。");
    router.refresh();
  }

  async function handleRenamePasskey(passkeyId: string, currentName: string) {
    const nextName = passkeyDraftNames[passkeyId]?.trim();

    if (!nextName) {
      setStatus(null);
      setError("Passkey 名称不能为空。");
      return;
    }

    if (nextName === currentName) {
      setStatus("Passkey 名称未变化。");
      setError(null);
      return;
    }

    setStatus(null);
    setError(null);
    const response = await fetch(`/api/auth/passkeys/${passkeyId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: nextName }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({ message: "更新 Passkey 名称失败。" }))) as {
        message?: string;
      };
      setError(result.message ?? "更新 Passkey 名称失败。");
      return;
    }

    setStatus("Passkey 名称已更新。");
    router.refresh();
  }

  async function handleRevokeSession(sessionId: string) {
    setStatus(null);
    setError(null);
    const response = await fetch(`/api/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({ message: "撤销设备会话失败。" }))) as {
        message?: string;
      };
      setError(result.message ?? "撤销设备会话失败。");
      return;
    }

    setStatus("设备会话已撤销。");
    router.refresh();
  }

  return (
    <section aria-label="账号中心内容">
      <p>{user.email ?? "未绑定邮箱"}</p>
      {status ? <p role="status">{status}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <h3>已开通角色</h3>
      <p>
        当前工作角色：
        {activeRole ? ROLE_LABELS[activeRole] : "未选择"}
      </p>
      <ul aria-label="已开通角色列表">
        {user.roles.map((role) => (
          <li key={role}>
            <p>{ROLE_LABELS[role]}</p>
            <p>{activeRole === role ? "当前使用中" : "已开通"}</p>
          </li>
        ))}
      </ul>
      {unavailableRoles.length > 0 ? (
        <>
          <h3>可开通角色</h3>
          <ul aria-label="可开通角色列表">
            {unavailableRoles.map((role) => (
              <li key={role}>
                <p>{ROLE_LABELS[role]}</p>
                <p>{ROLE_GUIDANCE[role]}</p>
                <p>当前账号暂未开通{ROLE_LABELS[role]}能力。</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {securityTips.length > 0 ? (
        <>
          <h3>安全提示</h3>
          <ul aria-label="安全提示列表">
            {securityTips.map((tip) => (
              <li key={tip}>
                <p>{tip}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h3>已绑定 Passkey</h3>
      <p>{passkeyCount} 个</p>
      {passkeys.length > 0 ? (
        <ul aria-label="Passkey 列表">
          {passkeys.map((passkey) => (
            <li key={passkey.id}>
              <p>{passkey.name}</p>
              {passkey.createdAtLabel ? <p>{passkey.createdAtLabel}</p> : null}
              <label>
                <span className="sr-only">Passkey 名称 {passkey.name}</span>
                <input
                  aria-label={`Passkey 名称 ${passkey.name}`}
                  value={passkeyDraftNames[passkey.id] ?? passkey.name}
                  onChange={(event) =>
                    setPasskeyDraftNames((current) => ({
                      ...current,
                      [passkey.id]: event.target.value,
                    }))
                  }
                />
              </label>
              <button type="button" onClick={() => void handleRenamePasskey(passkey.id, passkey.name)}>
                重命名 {passkey.name}
              </button>
              <button type="button" onClick={() => void handleDeletePasskey(passkey.id)}>
                删除 {passkey.name}
              </button>
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
              {session.categoryLabel ? <p>{session.categoryLabel}</p> : null}
              {session.isCurrent ? <p>活跃中</p> : null}
              {session.createdAtLabel ? <p>{session.createdAtLabel}</p> : null}
              {session.expiresAtLabel ? <p>{session.expiresAtLabel}</p> : null}
              {session.ipAddressLabel ? <p>{session.ipAddressLabel}</p> : null}
              {!session.isCurrent ? (
                <button type="button" onClick={() => void handleRevokeSession(session.id)}>
                  撤销 {session.label}
                </button>
              ) : null}
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
