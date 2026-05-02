import { describe, expect, it } from "vitest";

import { normalizeAttachments } from "../storage";

describe("storage", () => {
  it("normalizes JSON attachment metadata", () => {
    const attachments = normalizeAttachments([
      {
        url: "/uploads/license.pdf",
        originalName: "license.pdf"
      }
    ]);

    expect(attachments).toEqual([
      {
        url: "/uploads/license.pdf",
        originalName: "license.pdf"
      }
    ]);
  });
});
