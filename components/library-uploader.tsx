"use client";

import { useId, useRef, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import {
  isAcceptedLibraryFile,
  isAcceptedLibraryVideo,
  prepareLibraryImage,
  prepareLibraryVideo,
  uploadLibraryImageWithProgress,
} from "@/lib/library-image-client";
import {
  UNSPECIFIED_CATEGORY_ID,
  suggestLibraryNameFromFile,
  type LibraryCategory,
  type LibraryImage,
  type LibrarySettings,
} from "@/lib/library-shared";
import { cn } from "@/lib/utils";

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function LibraryUploader({
  settings,
  categories,
  onUploaded,
}: {
  settings: LibrarySettings;
  categories: LibraryCategory[];
  onUploaded: (image: LibraryImage) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([UNSPECIFIED_CATEGORY_ID]);
  const [over, setOver] = useState(false);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"idle" | "busy" | "success" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [pending, setPending] = useState(false);
  const dropId = useId();
  const statusId = useId();

  function toggleCategory(id: string) {
    setCategoryIds((prev) => {
      const has = prev.includes(id);
      if (has) {
        const next = prev.filter((c) => c !== id);
        return next.length ? next : [UNSPECIFIED_CATEGORY_ID];
      }
      if (id === UNSPECIFIED_CATEGORY_ID) return [UNSPECIFIED_CATEGORY_ID];
      return [...prev.filter((c) => c !== UNSPECIFIED_CATEGORY_ID), id];
    });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || pending) return;
    const files = [...fileList].filter(isAcceptedLibraryFile);
    if (files.length === 0) {
      setStatusKind("error");
      setStatus(t("library.uploadTypes"));
      setShowProgress(false);
      return;
    }
    if (files.length > settings.maxFilesPerBatch) {
      setStatusKind("error");
      setStatus(
        t("library.uploadMaxFiles").replace(
          "{n}",
          String(settings.maxFilesPerBatch),
        ),
      );
      setShowProgress(false);
      return;
    }

    setPending(true);
    setStatusKind("busy");
    setShowProgress(true);
    setProgress(0);
    setStatus(
      files.length === 1
        ? t("library.uploadingNamed").replace("{name}", files[0]!.name)
        : t("library.uploadingMany").replace("{n}", String(files.length)),
    );

    // Let the browser paint the progress UI before heavy canvas / XHR work.
    await nextFrame();
    await nextFrame();

    const total = files.length;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        setStatus(t("library.uploadingNamed").replace("{name}", file.name));
        const base = (i / total) * 100;
        const span = 100 / total;
        setProgress(Math.round(base));

        const prepared = isAcceptedLibraryVideo(file)
          ? await prepareLibraryVideo(file, settings)
          : await prepareLibraryImage(file, settings);
        const form = new FormData();
        form.set("id", prepared.id);
        form.set("name", suggestLibraryNameFromFile(file.name));
        form.set("alt", "");
        form.set("width", String(prepared.width));
        form.set("height", String(prepared.height));
        form.set("categoryIds", JSON.stringify(categoryIds));
        form.set(
          "master",
          new File([prepared.masterBlob], file.name, {
            type: prepared.masterContentType,
          }),
        );
        if (prepared.webpBlob) {
          form.set(
            "webp",
            new File([prepared.webpBlob], `${prepared.id}.webp`, {
              type: "image/webp",
            }),
          );
        }

        await nextFrame();
        const result = await uploadLibraryImageWithProgress(form, (percent) => {
          setProgress(Math.round(base + (percent / 100) * span));
        });
        const image = result.image as LibraryImage | undefined;
        if (image) onUploaded(image);
      }

      setProgress(100);
      setStatusKind("success");
      setStatus(
        files.length === 1
          ? t("library.uploadDoneOne")
          : t("library.uploadDoneMany").replace("{n}", String(files.length)),
      );
    } catch (error) {
      setStatusKind("error");
      setStatus(error instanceof Error ? error.message : t("library.uploadFailed"));
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
      window.setTimeout(() => {
        setShowProgress(false);
        setProgress(0);
      }, 800);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-700 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-teal-200">{t("library.upload")}</h2>
          <p className="text-sm text-slate-400">
            {t("library.uploadHint").replace("{w}", String(settings.maxWidth))}
          </p>
        </div>
        <span className="rounded-md border border-slate-600 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400">
          {settings.maxWidth}px
          {settings.convertToWebp ? " · WebP" : ""}
        </span>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-300">
          {t("library.categories")}
        </legend>
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="inline-flex items-center gap-2 text-sm text-slate-300"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal-500"
                checked={categoryIds.includes(cat.id)}
                disabled={pending}
                onChange={() => toggleCategory(cat.id)}
              />
              {cat.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div
        id={dropId}
        role="button"
        tabIndex={0}
        aria-describedby={statusId}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-950/40 px-4 py-10 text-center transition-colors",
          over && "border-teal-400 bg-teal-950/30",
          pending && "pointer-events-none opacity-70",
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          multiple
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <p className="text-base font-medium text-slate-200">{t("library.dropTitle")}</p>
        <p className="text-sm text-slate-400">
          {t("library.dropOr")}{" "}
          <button
            type="button"
            className="text-teal-300 underline underline-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {t("library.browse")}
          </button>
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
          JPG · PNG · WebP · MP4 · WebM ·{" "}
          {Math.round(settings.maxBytes / (1024 * 1024))} MB img /{" "}
          {Math.round(settings.maxVideoBytes / (1024 * 1024))} MB vid ·{" "}
          {settings.maxFilesPerBatch} {t("library.files")}
        </p>
      </div>

      <div
        id={statusId}
        className={cn(
          "min-h-[1.25rem] space-y-3 text-sm",
          statusKind === "error" && "text-red-300",
          statusKind === "success" && "text-teal-300",
          statusKind === "busy" && "text-slate-200",
          statusKind === "idle" && "text-slate-400",
        )}
        aria-live="polite"
      >
        {status ? <p>{status}</p> : null}
        {showProgress ? (
          <div className="flex items-center gap-3">
            <div
              className="h-3 min-w-0 flex-1 overflow-hidden rounded-full border border-slate-600 bg-slate-900"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-label={t("library.progress")}
            >
              <div
                className="h-full min-w-[2%] bg-teal-400 transition-[width] duration-150 ease-out"
                style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-xs text-slate-300">
              {Math.round(progress)}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
