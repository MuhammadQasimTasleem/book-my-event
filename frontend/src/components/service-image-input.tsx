"use client";

import { useId } from "react";

const MAX_IMAGES = 12;

type Props = {
  imageFiles: File[];
  onImageFilesChange: (files: File[]) => void;
  /** Images already stored on the service (counts toward the limit). */
  existingImageCount?: number;
};

export function ServiceImageInput({
  imageFiles,
  onImageFilesChange,
  existingImageCount = 0,
}: Props) {
  const inputId = useId();
  const total = existingImageCount + imageFiles.length;
  const remaining = Math.max(0, MAX_IMAGES - total);
  const fileCap = Math.max(0, MAX_IMAGES - existingImageCount);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (picked.length === 0) return;
    const next = [...imageFiles, ...picked].slice(0, fileCap);
    onImageFilesChange(next);
  };

  const removeFile = (idx: number) => {
    onImageFilesChange(imageFiles.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.18em] text-muted">
        Images from your device
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="input cursor-pointer py-2 normal-case file:mr-3 file:rounded-lg file:border-0 file:bg-cream-100 file:px-3 file:py-1.5 file:text-sm file:text-espresso-200"
          onChange={onPick}
        />
      </label>
      {imageFiles.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-xs text-espresso-200">
          {imageFiles.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-1 rounded-full border border-espresso-200/20 bg-cream-50 px-2 py-1"
            >
              <span className="max-w-[180px] truncate">{f.name}</span>
              <button
                type="button"
                className="text-rose-600 hover:underline"
                onClick={() => removeFile(i)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs leading-relaxed text-muted">
        <strong className="font-medium text-espresso-200/90">Gallery:</strong>{" "}
        {total} / {MAX_IMAGES} ({remaining} slot{remaining === 1 ? "" : "s"} left). JPEG,
        PNG, WebP, or GIF up to the per-service limit — files are stored on this site.
      </p>
    </div>
  );
}

export { MAX_IMAGES };
