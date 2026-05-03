import Link from "next/link";

export function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-title" role="region">
      <p className="eyebrow">市集招募平台</p>
      <h2 id="hero-title">让市集招募、报名与管理更高效</h2>
      <p className="hero-copy">
        面向主办方与摊主的一体化运营平台，覆盖活动发布、报名管理与执行协同。
      </p>
      <div className="hero-actions">
        <Link href="/markets" className="button button-primary">
          查看招募活动
        </Link>
        <Link href="/organizer/markets" prefetch={false} className="button button-secondary">
          进入主办方端
        </Link>
      </div>
    </section>
  );
}
