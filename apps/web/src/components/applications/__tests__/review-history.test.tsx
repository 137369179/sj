import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReviewHistory } from "../review-history";

describe("ReviewHistory", () => {
  it("renders ordered review timeline items", () => {
    render(
      <ReviewHistory
        reviews={[
          {
            id: "review_2",
            applicationId: "app_1",
            organizerId: "org_1",
            decision: "approve",
            reviewNote: "复核通过",
            createdAt: new Date("2026-05-02T09:00:00.000Z")
          },
          {
            id: "review_1",
            applicationId: "app_1",
            organizerId: "org_1",
            decision: "reject",
            reviewNote: "首轮资料不完整",
            createdAt: new Date("2026-05-02T08:30:00.000Z")
          }
        ]}
      />
    );

    expect(screen.getByText("审核历史")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "审核历史列表" })).toBeInTheDocument();
    expect(screen.getByText("2026-05-02 · 通过 · 复核通过")).toBeInTheDocument();
    expect(screen.getByText("2026-05-02 · 拒绝 · 首轮资料不完整")).toBeInTheDocument();
  });

  it("renders the empty state when there are no review records", () => {
    render(<ReviewHistory reviews={[]} />);

    expect(screen.getByText("审核历史")).toBeInTheDocument();
    expect(screen.getByText("暂无审核历史")).toBeInTheDocument();
  });

  it("renders structured supplement and waitlist decisions", () => {
    render(
      <ReviewHistory
        reviews={[
          {
            id: "review_2",
            applicationId: "app_1",
            organizerId: "org_1",
            decision: "supplement",
            reviewNote: "请补充品牌资料包",
            createdAt: new Date("2026-05-02T09:00:00.000Z")
          },
          {
            id: "review_1",
            applicationId: "app_1",
            organizerId: "org_1",
            decision: "waitlist",
            reviewNote: "当前先列入候补名单",
            createdAt: new Date("2026-05-02T08:30:00.000Z")
          }
        ]}
      />
    );

    expect(screen.getByText("2026-05-02 · 补件 · 请补充品牌资料包")).toBeInTheDocument();
    expect(screen.getByText("2026-05-02 · 候补 · 当前先列入候补名单")).toBeInTheDocument();
  });
});
