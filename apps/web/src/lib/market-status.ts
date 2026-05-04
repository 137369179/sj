import type { MarketStatus } from "@prisma/client";

const marketStatusLabels: Record<MarketStatus, string> = {
  draft: "草稿",
  published: "已发布",
  recruiting: "招募中",
  reviewing: "审核中",
  confirmed: "已确认",
  ongoing: "进行中",
  completed: "已完成"
};

export function getMarketStatusLabel(status: string) {
  if (status in marketStatusLabels) {
    return marketStatusLabels[status as MarketStatus];
  }
  return status;
}