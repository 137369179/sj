import { NextResponse } from "next/server";
import { storage } from "../../../server/storage";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "invalid file" }, { status: 400 });
  }

  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    return NextResponse.json({ message: "unsupported file type" }, { status: 415 });
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json({ message: "file too large" }, { status: 413 });
  }

  try {
    const { url } = await storage.upload(file);

    return NextResponse.json(
      {
        url,
        originalName: file.name
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ message: "upload failed" }, { status: 500 });
  }
}
