import { beforeEach, describe, expect, it, vi } from "vitest";

import * as fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { POST } from "./route";

describe("POST /api/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("test-uuid-1234-1234-1234-1234-123456789abc");
  });

  it("stores an allowed file and returns attachment metadata", async () => {
    const uploadPath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "test-uuid-1234-1234-1234-1234-123456789abc.pdf"
    );
    const request = createUploadRequest(
      new File(["file-content"], "license.pdf", { type: "application/pdf" })
    );

    const response = await POST(request);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      url: "/uploads/test-uuid-1234-1234-1234-1234-123456789abc.pdf",
      originalName: "license.pdf"
    });
    await expect(fs.readFile(uploadPath)).resolves.toBeInstanceOf(Buffer);
    await fs.rm(uploadPath, { force: true });
  });

  it("rejects unsupported file types", async () => {
    const request = createUploadRequest(
      new File(["file-content"], "script.exe", {
        type: "application/x-msdownload"
      })
    );

    const response = await POST(request);

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toEqual({
      message: "unsupported file type"
    });
  });

  it("rejects files that exceed the maximum size", async () => {
    const request = createUploadRequest(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "huge.pdf", {
        type: "application/pdf"
      })
    );

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      message: "file too large"
    });
  });
});

function createUploadRequest(file: File) {
  const uploadFile = file as File & {
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };

  if (typeof uploadFile.arrayBuffer !== "function") {
    uploadFile.arrayBuffer = async () =>
      new TextEncoder().encode("file-content").buffer;
  }

  const formData = new FormData();
  formData.set("file", uploadFile);
  return {
    formData: vi.fn().mockResolvedValue(formData)
  } as unknown as Request;
}
