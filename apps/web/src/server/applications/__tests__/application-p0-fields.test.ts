import { describe, expect, it } from "vitest";

import { buildApplicationPayload } from "../service";

describe("application p0 fields", () => {
  it("accepts applicationNote, boothPreference and attachments input", () => {
    const payload = buildApplicationPayload({
      marketId: "market_1",
      boothPreference: "靠近主通道",
      applicationNote: "主营手作咖啡",
      attachments: [
        {
          url: "/uploads/license.png",
          originalName: "license.png"
        }
      ]
    });

    expect(payload.applicationNote).toBe("主营手作咖啡");
    expect(payload.boothPreference).toBe("靠近主通道");
    expect(payload.attachments).toHaveLength(1);
  });
});
