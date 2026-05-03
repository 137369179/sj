import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

import type { StorageProvider } from "./provider";

/**
 * Real S3 Storage Provider implementation.
 * Uses @aws-sdk/client-s3 to upload files to an AWS S3 bucket.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    region: string
  ) {
    this.client = new S3Client({ region });
  }

  async upload(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate a unique filename using UUID to prevent collisions
    const extension = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
    const storedName = `${crypto.randomUUID()}${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storedName,
        Body: buffer,
        ContentType: file.type
      })
    );

    // In a real S3 setup, this would be your CloudFront or S3 website endpoint
    // Fallback to S3's default URL format if no custom domain is set
    const baseUrl = process.env.S3_PUBLIC_URL || `https://${this.bucket}.s3.amazonaws.com`;

    return {
      url: `${baseUrl}/${storedName}`,
      storedName
    };
  }
}
