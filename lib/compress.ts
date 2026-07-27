"use client";

// Shrinks an image in the browser before upload. Large renderings and
// phone photos (5-15 MB) get resized to web size (~2200px, JPEG) so
// they never hit the server's request size limit. Small files and
// non-images pass through untouched.
export async function compressImage(file: File, maxDim = 2200, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 800 * 1024) return file; // already small

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // format the browser cannot decode (e.g. HEIC on some browsers)
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
