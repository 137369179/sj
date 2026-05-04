import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "../../../../components/layout/app-shell";
import { getSessionUser } from "../../../../lib/auth";
import { listOrganizers } from "../../../../server/admin/service";
import { verifyOrganizerAction } from "./actions";

export default async function AdminOrganizersPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "admin") {
    redirect("/");
  }

  const organizers = await listOrganizers();

  return (
    <AppShell>
      <main aria-labelledby="admin-title">
        <h2 id="admin-title">平台运营与审核后台 - 主办方管理</h2>
        <p>当前以平台管理员身份访问。</p>

        <section aria-label="主办方列表" style={{ marginTop: "2rem" }}>
          <h3>入驻主办方列表</h3>
          {organizers.length === 0 ? (
            <p>暂无入驻的主办方。</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {organizers.map((org) => (
                <li
                  key={org.id}
                  style={{
                    marginBottom: "1rem",
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <h4>
                      {org.name}{" "}
                      <span
                        style={{
                          fontSize: "0.8rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: org.isVerified ? "#dcfce7" : "#fee2e2",
                          color: org.isVerified ? "#166534" : "#991b1b"
                        }}
                      >
                        {org.isVerified ? "已认证" : "未认证"}
                      </span>
                    </h4>
                    <p>联系电话：{org.phone}</p>
                    <p>入驻时间：{org.createdAt.toLocaleString()}</p>
                    <p>已发布市集数：{org.marketCount} 个</p>
                  </div>
                  <div>
                    {!org.isVerified && (
                      <form action={verifyOrganizerAction.bind(null, org.id)}>
                        <button type="submit">通过资质审核</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}