import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStoragePlugin } from "@/lib/plugins/registry";
import sharp from "sharp";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB for images
const MAX_VIDEO_SIZE = 4 * 1024 * 1024; // 4MB for videos (Vercel serverless limit)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4"];

/**
 * `file.type` comes straight from the client and can be forged, so it is only
 * used to pick the processing branch. The real format is decided by sniffing
 * magic bytes below — otherwise a caller could upload arbitrary content
 * (e.g. HTML/SVG that can execute when fetched back) while declaring
 * `image/png`, and the video branch would store it verbatim.
 */
function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  const gifHeader = buffer.subarray(0, 6).toString("latin1");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return "image/gif";
  }
  // RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** MP4/QuickTime files start with a 4-byte size then the "ftyp" box. */
function sniffIsMp4(buffer: Buffer): boolean {
  return buffer.length >= 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp";
}

async function compressToJpg(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabledStorage = process.env.ENABLED_STORAGE || "url";
  
  if (enabledStorage === "url") {
    return NextResponse.json(
      { error: "File upload is not enabled. Using URL storage mode." },
      { status: 400 }
    );
  }

  const storagePlugin = getStoragePlugin(enabledStorage);
  
  if (!storagePlugin) {
    return NextResponse.json(
      { error: `Storage plugin "${enabledStorage}" not found` },
      { status: 500 }
    );
  }

  if (!storagePlugin.isConfigured()) {
    return NextResponse.json(
      { error: `Storage plugin "${enabledStorage}" is not configured` },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Determine if file is image or video
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    // Validate file type
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4 videos are allowed." },
        { status: 400 }
      );
    }

    // Validate file size based on type
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 4MB.` },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sniff the real format and reject when it disagrees with the declared type
    if (isImage) {
      const sniffed = sniffImageType(buffer);
      if (!sniffed || !ALLOWED_IMAGE_TYPES.includes(sniffed)) {
        return NextResponse.json(
          { error: "File content is not a valid JPEG, PNG, GIF or WebP image." },
          { status: 400 }
        );
      }
    } else if (!sniffIsMp4(buffer)) {
      return NextResponse.json(
        { error: "File content is not a valid MP4 video." },
        { status: 400 }
      );
    }

    // Generate filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    let uploadBuffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (isVideo) {
      // For videos, upload as-is without compression
      uploadBuffer = buffer;
      filename = `prompt-media-${timestamp}-${randomId}.mp4`;
      mimeType = "video/mp4";
    } else {
      // For images, compress to JPG. Re-encoding also drops anything that is
      // not a genuinely decodable image, so surface failures as a 400 instead
      // of leaking a generic 500.
      try {
        uploadBuffer = await compressToJpg(buffer);
      } catch {
        return NextResponse.json(
          { error: "Image could not be decoded. The file may be corrupt." },
          { status: 400 }
        );
      }
      filename = `prompt-media-${timestamp}-${randomId}.jpg`;
      mimeType = "image/jpeg";
    }

    // Upload to storage
    const result = await storagePlugin.upload(uploadBuffer, {
      filename,
      mimeType,
      folder: "prompt-media",
    });

    return NextResponse.json({
      url: result.url,
      size: result.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
