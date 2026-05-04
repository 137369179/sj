import { describe, expect, it } from "vitest";

import { metadata } from "../layout";

describe("Root layout metadata", () => {
  it("defines a default site title and favicon for the app shell", () => {
    expect(metadata.title).toEqual({
      default: "市集招募平台",
      template: "%s | 市集招募平台"
    });
    expect(metadata.description).toBe("让市集招募、报名、审核与摊位管理更高效。");
    expect(metadata.icons).toEqual({
      icon: ["/favicon.ico", "/favicon.svg"]
    });
  });
});
