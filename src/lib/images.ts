"use client";

import imageCompression from "browser-image-compression";
import { supabase } from "./supabase";

export interface UploadedImage {
  storage_path: string;
  thumb_path: string;
  width: number;
  height: number;
}

async function toWebp(file: File, maxPx: number, maxMB: number): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: maxPx,
    maxSizeMB: maxMB,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82,
  });
}

async function dimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Camera roll photo -> compressed webp (full + thumb) -> Supabase Storage.
// The canvas re-encode inside browser-image-compression bakes in EXIF
// orientation, so sideways iPhone photos come out upright.
export async function uploadPinImage(file: File, pinId: string): Promise<UploadedImage> {
  let source = file;
  // iOS transcodes HEIC to JPEG for image/* inputs; this is a belt-and-braces
  // fallback for raw .heic files arriving from other routes.
  if (/heic|heif/i.test(file.type) || /\.heic$|\.heif$/i.test(file.name)) {
    const { default: heic2any } = await import("heic2any");
    const blob = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })) as Blob;
    source = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  }

  const [full, thumb] = await Promise.all([
    toWebp(source, 1600, 0.4),
    toWebp(source, 400, 0.06),
  ]);
  const { width, height } = await dimensions(full);

  const base = `${pinId}/${crypto.randomUUID()}`;
  const storage_path = `${base}.webp`;
  const thumb_path = `${base}.thumb.webp`;

  const bucket = supabase().storage.from("pin-images");
  const [fullRes, thumbRes] = await Promise.all([
    bucket.upload(storage_path, full, { contentType: "image/webp" }),
    bucket.upload(thumb_path, thumb, { contentType: "image/webp" }),
  ]);
  if (fullRes.error) throw fullRes.error;
  if (thumbRes.error) throw thumbRes.error;

  return { storage_path, thumb_path, width, height };
}
