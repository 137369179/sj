export interface StorageProvider {
  /**
   * Uploads a file and returns its public URL
   */
  upload(file: File): Promise<{ url: string; storedName: string }>;
}
