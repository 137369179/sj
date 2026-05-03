import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser, SESSION_COOKIE_NAME, createSessionToken } from "../../lib/auth";
import { isUserRole } from "../../lib/roles";
import { AppShell } from "../../components/layout/app-shell";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const sessionUser = await getSessionUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  
  if (sessionUser) {
    redirect(resolvedSearchParams.returnTo ?? "/");
  }

  async function loginAction(formData: FormData) {
    "use server";
    
    const role = String(formData.get("role") ?? "");
    const userId = String(formData.get("userId") ?? "").trim();
    
    if (!isUserRole(role) || !userId) {
      redirect("/login?error=invalid_input");
    }

    const sessionToken = await createSessionToken(userId, role);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    redirect(resolvedSearchParams.returnTo ?? "/");
  }

  return (
    <AppShell>
      <main aria-labelledby="login-title">
        <h2 id="login-title">登录 (Stub)</h2>
        <p>这是一个用于开发和测试的简易登录入口，后续将替换为真实认证系统。</p>
        <form 
          action={loginAction}
          aria-label="登录表单"
        >
          {searchParams && (await searchParams).error === "invalid_input" && (
            <p role="alert" style={{ color: "red" }}>输入无效，请提供正确的角色和用户 ID。</p>
          )}
          <label>
            角色
            <select name="role" required defaultValue="vendor">
              <option value="vendor">摊主</option>
              <option value="organizer">主办方</option>
              <option value="admin">平台管理员</option>
            </select>
          </label>
          <label>
            用户 ID
            <input name="userId" type="text" required placeholder="例如: vendor_1" />
          </label>
          <button type="submit">登录</button>
        </form>
      </main>
    </AppShell>
  );
}