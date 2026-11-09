import sharp from "sharp";
import { ClubError, type Mode } from "../grimmunity/model";
import { one } from "../grimmunity/db";
import type { Pool } from "pg";
import { MAX_REFERENCE_BYTES, MAX_REFERENCE_PHOTOS, REFERENCE_PHOTO_TYPES } from "./photo-limits";

export function validatePhotoFiles(files: File[]) {
  if (files.length > MAX_REFERENCE_PHOTOS) throw new ClubError("custom_photo_limit", 400);
  for (const file of files) {
    if (!REFERENCE_PHOTO_TYPES.includes(file.type)) throw new ClubError("custom_photo_type", 400);
    if (!file.size || file.size > MAX_REFERENCE_BYTES) throw new ClubError("custom_photo_size", 413);
  }
}

// Decode and re-encode actual pixels: filenames and MIME claims are not trusted.
// Auto-orient before discarding metadata, including location/EXIF data.
export async function preparePhoto(file: File) {
  validatePhotoFiles([file]);
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const decoder = sharp(input, { limitInputPixels: 25_000_000, failOn: "warning" });
    const metadata = await decoder.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1)
      throw new Error("Unsupported image");
    const { data, info } = await decoder.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    if (data.length > MAX_REFERENCE_BYTES) throw new ClubError("custom_photo_size", 413);
    return { data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof ClubError) throw error;
    throw new ClubError("custom_photo_invalid", 400);
  }
}

export async function referencePhoto(pool: Pool, mode: Mode, id: string) {
  return one<{ data: Buffer }>(pool,
    `SELECT p.data FROM customs.reference_photos p JOIN customs.requests r ON r.id=p.request_id WHERE p.id=$1 AND r.mode=$2`,
    [id, mode]);
}
