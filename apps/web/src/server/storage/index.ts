import { LocalStorageProvider } from "./local-provider";
import { S3StorageProvider } from "./s3-provider";
import type { StorageProvider } from "./provider";

export function getStorageProvider(): StorageProvider {
  // Automatically switch to S3 if environment variables are configured
  if (process.env.S3_BUCKET && process.env.S3_REGION) {
    return new S3StorageProvider(process.env.S3_BUCKET, process.env.S3_REGION);
  }

  // Fallback to local storage for development
  return new LocalStorageProvider();
}

export const storage = getStorageProvider();
