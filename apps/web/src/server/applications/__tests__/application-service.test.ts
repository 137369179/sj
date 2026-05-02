import { describe, expect, it } from "vitest";

import { buildApplicationPayload, makeApplicationKey } from "../service";

describe("application service", () => {
  it("builds a valid application payload", () => {
    const payload = buildApplicationPayload({
      marketId: "m1",
      vendorId: "v1",
      boothPreference: "靠近主通道",
      note: "主营手作咖啡",
      attachments: [
        {
          url: "/uploads/license.pdf",
          originalName: "license.pdf"
        }
      ]
    });

    expect(payload.marketId).toBe("m1");
    expect(payload.vendorId).toBe("v1");
    expect(payload.boothPreference).toBe("靠近主通道");
    expect(payload.attachments).toEqual([
      {
        url: "/uploads/license.pdf",
        originalName: "license.pdf"
      }
    ]);
  });

  it("creates a deterministic idempotency key", () => {
    expect(makeApplicationKey("m1", "v1")).toBe("m1:v1");
  });
});
