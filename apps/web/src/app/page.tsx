import { AppShell } from "../components/layout/app-shell";
import { CtaSection } from "../components/marketing/cta-section";
import { FlowSection } from "../components/marketing/flow-section";
import { HeroSection } from "../components/marketing/hero-section";
import { RoleSection } from "../components/marketing/role-section";
import { ValueSection } from "../components/marketing/value-section";

export default function HomePage() {
  return (
    <AppShell>
      <main className="landing-page">
        <HeroSection />
        <ValueSection />
        <FlowSection />
        <RoleSection />
        <CtaSection />
      </main>
    </AppShell>
  );
}
