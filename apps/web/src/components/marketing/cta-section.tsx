import Link from "next/link";

export function CtaSection() {
  return (
    <section className="cta-section" aria-labelledby="cta-title" role="region">
      <h3 id="cta-title">现在开始建立更清晰的市集协作流程</h3>
      <div className="hero-actions">
        <Link href="/markets" className="button button-primary">
          查看招募活动
        </Link>
        <Link href="/organizer/markets" prefetch={false} className="button button-secondary">
          进入主办方端
        </Link>
      </div>
      <p className="footer-note">市集活动摊主招募与运营管理平台</p>
    </section>
  );
}
