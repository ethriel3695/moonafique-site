import { MAX_REFERENCE_BYTES, MAX_SOURCE_PHOTO_BYTES, REFERENCE_PHOTO_TYPES } from "./photo-limits";

export async function prepareClientPhoto(file: File): Promise<File> {
  if (!REFERENCE_PHOTO_TYPES.includes(file.type)) throw new Error("Choose JPG, PNG, or WebP photos. For HEIC photos, export a JPG first.");
  if (!file.size || file.size > MAX_SOURCE_PHOTO_BYTES) throw new Error("Choose photos up to 10 MB each.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 50_000_000)
      throw new Error("That photo is too large to prepare. Choose a smaller version.");
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn’t prepare this photo. Try another browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size > MAX_REFERENCE_BYTES) throw new Error("That photo is still too large. Choose a smaller version.");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch (error) {
    if (error instanceof DOMException) throw new Error("We couldn’t open that photo. Try a different JPG, PNG, or WebP image.");
    throw error;
  } finally { URL.revokeObjectURL(url); }
}
