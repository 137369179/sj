import { headers } from "next/headers";

import { auth } from "../../lib/auth-config";

export type AccountSessionSummary = {
  id: string;
  label: string;
  categoryLabel?: string;
  expiresAtLabel?: string;
  createdAtLabel?: string;
  ipAddressLabel?: string;
  isCurrent: boolean;
};

export type AccountPasskeySummary = {
  id: string;
  name: string;
  createdAtLabel?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readDateLabel(value: unknown, prefix: string): string | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const formatted = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${prefix} ${formatted}`;
}

function inferSessionCategory(userAgent?: string): string | undefined {
  if (!userAgent) {
    return undefined;
  }

  const normalized = userAgent.toLowerCase();

  if (normalized.includes("iphone") || normalized.includes("android") || normalized.includes("mobile")) {
    return "移动设备";
  }

  if (
    normalized.includes("chrome") ||
    normalized.includes("safari") ||
    normalized.includes("firefox") ||
    normalized.includes("edge")
  ) {
    return "浏览器设备";
  }

  return "已登录设备";
}

function readArray(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input;
  }

  const record = asRecord(input);
  if (!record) {
    return [];
  }

  if (Array.isArray(record.sessions)) {
    return record.sessions;
  }

  if (Array.isArray(record.passkeys)) {
    return record.passkeys;
  }

  return [];
}

function normalizeSession(
  value: unknown,
  currentSessionId?: string,
): AccountSessionSummary | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const id = readString(record.id) ?? readString(record.token);
  if (!id) {
    return null;
  }

  const userAgent = readString(record.userAgent);
  const ipAddress = readString(record.ipAddress);
  const label = userAgent ?? ipAddress ?? "当前设备会话";

  return {
    id,
    label,
    categoryLabel: inferSessionCategory(userAgent),
    createdAtLabel: readDateLabel(record.createdAt, "登录于"),
    expiresAtLabel: readDateLabel(record.expiresAt, "过期时间"),
    ipAddressLabel: ipAddress ? `IP ${ipAddress}` : undefined,
    isCurrent: currentSessionId === id,
  };
}

function normalizePasskey(value: unknown): AccountPasskeySummary | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const id = readString(record.id) ?? readString(record.credentialID);
  if (!id) {
    return null;
  }

  return {
    id,
    name: readString(record.name) ?? "未命名 Passkey",
    createdAtLabel: readDateLabel(record.createdAt, "创建于"),
  };
}

export async function listAccountSessions(): Promise<AccountSessionSummary[]> {
  const requestHeaders = await headers();
  const [result, currentSession] = await Promise.all([
    auth.api.listSessions({
      headers: requestHeaders,
    }),
    auth.api.getSession({
      headers: requestHeaders,
    }),
  ]);

  const currentSessionId =
    currentSession && typeof currentSession === "object" && "session" in currentSession
      ? readString((currentSession.session as Record<string, unknown>)?.id)
      : undefined;

  return readArray(result)
    .map((item) => normalizeSession(item, currentSessionId))
    .filter((item): item is AccountSessionSummary => item !== null);
}

export async function listAccountPasskeys(): Promise<AccountPasskeySummary[]> {
  const requestHeaders = await headers();
  const result = await auth.api.listPasskeys({
    headers: requestHeaders,
  });

  return readArray(result).map(normalizePasskey).filter((item): item is AccountPasskeySummary => item !== null);
}
