import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { preparePhoto, validatePhotoFiles } from "../../lib/customs/photos";
import { readSubmission } from "../../lib/customs/http";

async function fixture() {
  return new File([new Uint8Array(await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#69428a" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer())], "reference.jpg", { type: "image/jpeg" });
}
function submission(payload: string, files: File[] = []) {
  const body = new FormData(); body.set("payload", payload); files.forEach((file) => body.append("photos", file));
  return new Request("https://example.invalid/api/custom-requests", { method: "POST", body });
}
describe("private reference photo validation", () => {
  it("orients, bounds and re-encodes images without embedded metadata", async () => {
    const photo = await preparePhoto(await fixture());
    expect([photo.width, photo.height]).toEqual([800, 1600]);
    const info = await sharp(photo.data).metadata();
    expect(info.format).toBe("webp");
    expect(info.exif).toBeUndefined(); expect(info.icc).toBeUndefined(); expect(info.orientation).toBeUndefined();
  });
  it("rejects spoofed SVG, HTML, corrupt bytes and oversized files", async () => {
    for (const data of ['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>', '<html>test</html>', 'broken jpeg']) {
      await expect(preparePhoto(new File([data], "reference.jpg", { type: "image/jpeg" }))).rejects.toMatchObject({ status: 400 });
    }
    expect(() => validatePhotoFiles([new File([new Uint8Array(1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" })])).toThrow();
    expect(() => validatePhotoFiles([new File(["svg"], "a.svg", { type: "image/svg+xml" })])).toThrow();
    expect(() => validatePhotoFiles([new File([], "empty.jpg", { type: "image/jpeg" })])).toThrow();
  });
  it("parses bounded multipart, supports older JSON clients, and rejects malformed uploads", async () => {
    const photo = await fixture();
    const parsed = await readSubmission(submission('{"name":"Visitor"}', [photo]));
    expect(parsed.input).toEqual({ name: "Visitor" }); expect(parsed.photos).toHaveLength(1);
    expect(await readSubmission(new Request("https://example.invalid", { method: "POST", body: '{}' }))).toEqual({ input: {}, photos: [] });
    await expect(readSubmission(submission('{}', [photo, photo, photo, photo]))).rejects.toMatchObject({ code: "custom_photo_limit" });
    await expect(readSubmission(submission('x'.repeat(32769)))).rejects.toMatchObject({ status: 400 });
    await expect(readSubmission(new Request("https://example.invalid", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=x" }, body: 'x'.repeat(3 * 1024 * 1024 + 65537) }))).rejects.toMatchObject({ status: 413 });
    const body = new FormData(); body.set("payload", "{}"); body.append("photos", "not a file");
    await expect(readSubmission(new Request("https://example.invalid", { method: "POST", body }))).rejects.toMatchObject({ status: 400 });
  });
});
