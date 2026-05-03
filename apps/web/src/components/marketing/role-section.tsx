import Link from "next/link";

export function RoleSection() {
  return (
    <section className="role-section" aria-labelledby="role-title" role="region">
      <h3 id="role-title">选择你的使用路径</h3>
      <div className="role-grid">
        <article className="role-card">
          <h4>我是摊主</h4>
          <p>快速查看招募信息、选择合适市集并完成报名。</p>
          <Link href="/markets" className="button button-primary">
            去摊主端
          </Link>
        </article>
        <article className="role-card">
          <h4>我是主办方</h4>
          <p>统一发布活动、管理报名与跟进执行。</p>
          <Link href="/organizer/markets" prefetch={false} className="button button-secondary">
            去主办方端
          </Link>
        </article>
      </div>
    </section>
  );
}
