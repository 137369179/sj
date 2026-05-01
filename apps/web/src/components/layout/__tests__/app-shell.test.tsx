import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "../app-shell";

describe("AppShell", () => {
  it("renders the product name and role navigation", () => {
    render(
      <AppShell>
        <main>content</main>
      </AppShell>
    );

    expect(screen.getByText("市集招募平台")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "摊主端" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "主办方端" })).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
