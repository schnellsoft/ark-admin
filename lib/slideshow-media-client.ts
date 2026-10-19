import {
  isAcceptedLibraryFile,
  isAcceptedLibraryVideo,
  prepareLibraryImage,
  prepareLibraryVideo,
} from "@/lib/library-image-client";
import {
  defaultDesktopCrop,
  defaultMobileCrop,
  encodeSlideVariants,
} from "@/lib/slide-crop-client";
import type { LibrarySettings } from "@/lib/library-shared";
import type {
  DesktopCrop,
  ImageFilters,
  ImageFocus,
  MobileCrop,
  SlideshowOutput,
  SlideshowSlide,
} from "@/lib/slideshow-shared";
import { DEFAULT_FILTERS, focusFromCrop } from "@/lib/slideshow-shared";
import {
  DEFAULT_SLIDE_SCOPE,
  slideFileApi,
  slideItemApi,
  slideMediaApi,
  type SlideApiScope,
} from "@/lib/slide-api-scope";

function masterFile(prepared: {
  masterBlob: Blob;
  masterContentType: string;
  sourceName: string;
}) {
  return new File([prepared.masterBlob], prepared.sourceName || "upload.bin", {
    type: prepared.masterContentType,
  });
}

async function uploadVariants(input: {
  slideId: string;
  version: string;
  sourceKey?: string | null;
  blob: Blob;
  crop: MobileCrop;
  desktopCrop?: DesktopCrop | null;
  desktopFocus?: ImageFocus | null;
  desktopRatio?: string;
  filters: ImageFilters;
  title: string;
  alt: string;
  output?: SlideshowOutput;
  scope?: SlideApiScope;
}): Promise<SlideshowSlide> {
  const scope = input.scope ?? DEFAULT_SLIDE_SCOPE;
  const bitmap = await createImageBitmap(input.blob, {
    imageOrientation: "from-image",
  } as ImageBitmapOptions);
  const desktopCrop =
    input.desktopCrop ??
    defaultDesktopCrop(bitmap.width, bitmap.height, input.desktopRatio ?? "16:9");
  const desktopFocus =
    input.desktopFocus ?? focusFromCrop(desktopCrop, bitmap.width, bitmap.height);
  bitmap.close();

  const { variants, files } = await encodeSlideVariants({
    file: input.blob,
    slideId: input.slideId,
    version: input.version,
    crop: input.crop,
    desktopCrop,
    desktopRatio: input.desktopRatio,
    filters: input.filters,
    output: input.output,
  });

  const form = new FormData();
  form.set("mode", "variants");
  form.set("title", input.title);
  form.set("alt", input.alt);
  form.set("mobileCrop", JSON.stringify(input.crop));
  form.set("desktopCrop", JSON.stringify(desktopCrop));
  form.set("desktopFocus", JSON.stringify(desktopFocus));
  form.set(
    "filesJson",
    JSON.stringify({
      ...files,
      sourceKey: input.sourceKey ?? undefined,
    }),
  );
  for (const v of variants) {
    form.set(
      `variant:${v.fileName}`,
      new File([v.blob], v.fileName, { type: v.contentType }),
    );
  }

  const res = await fetch(slideMediaApi(input.slideId, scope), {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as { slide?: SlideshowSlide; error?: string };
  if (!res.ok || !data.slide) {
    throw new Error(data.error || "Variant upload failed");
  }

  const put = await fetch(slideItemApi(input.slideId, scope), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      alt: input.alt,
      filters: input.filters,
      mobileCrop: input.crop,
      desktopCrop,
      desktopFocus,
    }),
  });
  const putData = (await put.json()) as { slide?: SlideshowSlide };
  return putData.slide ?? data.slide;
}

export async function uploadSlideMedia(input: {
  slideId: string;
  file: File;
  title?: string;
  alt?: string;
  librarySettings: LibrarySettings;
  crop?: MobileCrop | null;
  desktopCrop?: DesktopCrop | null;
  desktopFocus?: ImageFocus | null;
  desktopRatio?: string;
  filters?: ImageFilters;
  output?: SlideshowOutput;
  scope?: SlideApiScope;
}): Promise<SlideshowSlide> {
  const scope = input.scope ?? DEFAULT_SLIDE_SCOPE;
  const isVideo = isAcceptedLibraryVideo(input.file);
  if (!isVideo && !isAcceptedLibraryFile(input.file)) {
    throw new Error("Unsupported file type");
  }

  const prepared = isVideo
    ? await prepareLibraryVideo(input.file, input.librarySettings)
    : await prepareLibraryImage(input.file, input.librarySettings);

  const title = input.title ?? input.file.name.replace(/\.[^.]+$/, "");
  const form = new FormData();
  form.set("mode", "upload");
  form.set("title", title);
  form.set("alt", input.alt ?? "");
  form.set("kind", prepared.kind);
  form.set("width", String(prepared.width));
  form.set("height", String(prepared.height));
  form.set("master", masterFile(prepared));
  if (prepared.webpBlob) {
    form.set(
      "webp",
      new File([prepared.webpBlob], `${prepared.id}.webp`, { type: "image/webp" }),
    );
  }

  const res = await fetch(slideMediaApi(input.slideId, scope), {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as {
    slide?: SlideshowSlide;
    sourceKey?: string;
    error?: string;
  };
  if (!res.ok || !data.slide) {
    throw new Error(data.error || "Upload failed");
  }

  const slide = data.slide;
  if (isVideo) return slide;

  const crop =
    input.crop ??
    slide.mobileCrop ??
    defaultMobileCrop(prepared.width || 1920, prepared.height || 1080);

  return uploadVariants({
    slideId: input.slideId,
    version: slide.version,
    sourceKey: data.sourceKey ?? slide.files.sourceKey,
    blob: prepared.masterBlob,
    crop,
    desktopCrop: input.desktopCrop ?? slide.desktopCrop,
    desktopFocus: input.desktopFocus ?? slide.desktopFocus,
    desktopRatio: input.desktopRatio,
    filters: input.filters ?? slide.filters ?? DEFAULT_FILTERS,
    title,
    alt: slide.alt,
    output: input.output,
    scope,
  });
}

export async function importSlideFromLibrary(input: {
  slideId: string;
  libraryId: string;
  title?: string;
  alt?: string;
  desktopCrop?: DesktopCrop | null;
  desktopFocus?: ImageFocus | null;
  desktopRatio?: string;
  filters?: ImageFilters;
  output?: SlideshowOutput;
  scope?: SlideApiScope;
}): Promise<SlideshowSlide> {
  const scope = input.scope ?? DEFAULT_SLIDE_SCOPE;
  const form = new FormData();
  form.set("mode", "import");
  form.set("libraryId", input.libraryId);
  form.set("title", input.title ?? "");
  form.set("alt", input.alt ?? "");

  const res = await fetch(slideMediaApi(input.slideId, scope), {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as {
    slide?: SlideshowSlide;
    sourceKey?: string;
    error?: string;
  };
  if (!res.ok || !data.slide) {
    throw new Error(data.error || "Import failed");
  }

  const slide = data.slide;
  if (slide.media_kind === "video") {
    if (input.title) {
      const put = await fetch(slideItemApi(input.slideId, scope), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: input.title, alt: input.alt ?? slide.alt }),
      });
      const putData = (await put.json()) as { slide?: SlideshowSlide };
      return putData.slide ?? slide;
    }
    return slide;
  }

  const sourceKey = data.sourceKey || slide.files.sourceKey;
  if (!sourceKey) throw new Error("Import did not return a source key");

  const blobRes = await fetch(slideFileApi(sourceKey, scope));
  if (!blobRes.ok) throw new Error("Could not load imported image");
  const blob = await blobRes.blob();

  const bitmap = await createImageBitmap(blob, {
    imageOrientation: "from-image",
  } as ImageBitmapOptions);
  const crop = defaultMobileCrop(bitmap.width, bitmap.height);
  const desktopCrop =
    input.desktopCrop ??
    defaultDesktopCrop(bitmap.width, bitmap.height, input.desktopRatio ?? "16:9");
  const desktopFocus =
    input.desktopFocus ?? focusFromCrop(desktopCrop, bitmap.width, bitmap.height);
  bitmap.close();

  return uploadVariants({
    slideId: input.slideId,
    version: slide.version,
    sourceKey,
    blob,
    crop,
    desktopCrop,
    desktopFocus,
    desktopRatio: input.desktopRatio,
    filters: input.filters ?? DEFAULT_FILTERS,
    title: input.title ?? slide.title,
    alt: input.alt ?? slide.alt,
    output: input.output,
    scope,
  });
}

export async function rebuildSlideVariants(input: {
  slideId: string;
  sourceUrl: string;
  libraryId: string | null;
  crop: MobileCrop;
  desktopCrop?: DesktopCrop | null;
  desktopFocus?: ImageFocus | null;
  desktopRatio?: string;
  filters: ImageFilters;
  alt: string;
  title: string;
  output?: SlideshowOutput;
  version?: string;
  sourceKey?: string | null;
  scope?: SlideApiScope;
}): Promise<SlideshowSlide> {
  const scope = input.scope ?? DEFAULT_SLIDE_SCOPE;
  const blobRes = await fetch(input.sourceUrl);
  if (!blobRes.ok) throw new Error("Could not load source image");
  const blob = await blobRes.blob();

  // Prefer attaching variants to the current version when we already have one.
  if (input.version) {
    return uploadVariants({
      slideId: input.slideId,
      version: input.version,
      sourceKey: input.sourceKey,
      blob,
      crop: input.crop,
      desktopCrop: input.desktopCrop,
      desktopFocus: input.desktopFocus,
      desktopRatio: input.desktopRatio,
      filters: input.filters,
      title: input.title,
      alt: input.alt,
      output: input.output,
      scope,
    });
  }

  if (!input.libraryId) throw new Error("Missing library asset for rebuild");

  const form = new FormData();
  form.set("mode", "import");
  form.set("libraryId", input.libraryId);
  form.set("title", input.title);
  form.set("alt", input.alt);
  form.set("mobileCrop", JSON.stringify(input.crop));
  if (input.desktopCrop) form.set("desktopCrop", JSON.stringify(input.desktopCrop));
  if (input.desktopFocus) form.set("desktopFocus", JSON.stringify(input.desktopFocus));

  const res = await fetch(slideMediaApi(input.slideId, scope), {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as {
    slide?: SlideshowSlide;
    sourceKey?: string;
    error?: string;
  };
  if (!res.ok || !data.slide) throw new Error(data.error || "Rebuild failed");

  return uploadVariants({
    slideId: input.slideId,
    version: data.slide.version,
    sourceKey: data.sourceKey ?? data.slide.files.sourceKey,
    blob,
    crop: input.crop,
    desktopCrop: input.desktopCrop,
    desktopFocus: input.desktopFocus,
    desktopRatio: input.desktopRatio,
    filters: input.filters,
    title: input.title,
    alt: input.alt,
    output: input.output,
    scope,
  });
}
