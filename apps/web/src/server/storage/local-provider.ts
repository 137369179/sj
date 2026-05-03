import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import type { StorageProvider } from "./provider";

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;
  private readonly publicPathPrefix: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
    this.publicPathPrefix = "/uploads/";
  }

  async upload(file: File) {
    const fileExtension = path.extname(file.name);
    // Use random UUID for security instead of sanitized original name
    const storedName = `${crypto.randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, storedName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(filePath, fileBuffer);

    return {
      url: `${this.publicPathPrefix}${storedName}`,
      storedName
    };
  }
}
