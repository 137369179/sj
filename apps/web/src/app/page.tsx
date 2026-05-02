import Link from "next/link";

import { AppShell } from "../components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <main>
        <section>
          <h2>让市集招募、报名与管理更高效</h2>
          <p>
            面向主办方与摊主的一体化运营平台，覆盖活动发布、报名管理与执行协同。
          </p>
          <Link href="/markets">查看招募活动</Link>
          <Link href="/organizer/markets">进入主办方端</Link>
        </section>
        <section>
          <h3>我是摊主</h3>
        </section>
        <section>
          <h3>我是主办方</h3>
        </section>
      </main>
    </AppShell>
  );
}
