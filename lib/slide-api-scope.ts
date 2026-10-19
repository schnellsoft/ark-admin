export type SlideApiScope = {
  kind: "slideshow" | "gallery";
  galleryId?: string;
};

export const DEFAULT_SLIDE_SCOPE: SlideApiScope = { kind: "slideshow" };

export function slideCollectionApi(scope: SlideApiScope = DEFAULT_SLIDE_SCOPE) {
  if (scope.kind === "gallery" && scope.galleryId) {
    return `/api/site/galleries/${scope.galleryId}/slides`;
  }
  return "/api/site/slideshow";
}

export function slideItemApi(
  slideId: string,
  scope: SlideApiScope = DEFAULT_SLIDE_SCOPE,
) {
  return `${slideCollectionApi(scope)}/${slideId}`;
}

export function slideMediaApi(
  slideId: string,
  scope: SlideApiScope = DEFAULT_SLIDE_SCOPE,
) {
  return `${slideItemApi(slideId, scope)}/media`;
}

export function slideLayerApi(
  slideId: string,
  scope: SlideApiScope = DEFAULT_SLIDE_SCOPE,
) {
  return `${slideItemApi(slideId, scope)}/layer`;
}

export function slideReorderApi(scope: SlideApiScope = DEFAULT_SLIDE_SCOPE) {
  return `${slideCollectionApi(scope)}/reorder`;
}

export function slideFileApi(
  key: string,
  scope: SlideApiScope = DEFAULT_SLIDE_SCOPE,
) {
  if (scope.kind === "gallery" && scope.galleryId) {
    return `/api/site/galleries/${scope.galleryId}/file?key=${encodeURIComponent(key)}`;
  }
  return `/api/site/slideshow/file?key=${encodeURIComponent(key)}`;
}

export function slideEditHref(
  slideId: string,
  scope: SlideApiScope = DEFAULT_SLIDE_SCOPE,
) {
  if (scope.kind === "gallery" && scope.galleryId) {
    return `/site/galleries/${scope.galleryId}/slides/${slideId}`;
  }
  return `/site/slideshow/${slideId}`;
}

export function slideListHref(scope: SlideApiScope = DEFAULT_SLIDE_SCOPE) {
  if (scope.kind === "gallery" && scope.galleryId) {
    return `/site/galleries/${scope.galleryId}/slides`;
  }
  return "/site/slideshow";
}

export function slideMediaPrefix(
  slideId: string,
  scope: SlideApiScope = DEFAULT_SLIDE_SCOPE,
) {
  if (scope.kind === "gallery" && scope.galleryId) {
    return `galleries/${scope.galleryId}/${slideId}/`;
  }
  return `slideshow/${slideId}/`;
}

export function slideThumbKeyForScope(
  slide: {
    id: string;
    version: string;
    files: {
      video?: { key: string } | null;
      sourceKey?: string | null;
      desktop?: Record<string, unknown>;
    };
  },
  scope: SlideApiScope = DEFAULT_SLIDE_SCOPE,
): string | null {
  if (slide.files.video?.key) return slide.files.video.key;
  if (slide.files.sourceKey) return slide.files.sourceKey;
  const desktop = slide.files.desktop ?? {};
  const sizes = Object.keys(desktop)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  const prefix = slideMediaPrefix(slide.id, scope);
  if (slide.version && sizes.length > 0) {
    const preferred = sizes.find((w) => w >= 640) ?? sizes[sizes.length - 1]!;
    return `${prefix}slide-${slide.id}.${slide.version}-d-${preferred}.jpg`;
  }
  if (slide.version) {
    return `${prefix}slide-${slide.id}.${slide.version}-source.jpg`;
  }
  return null;
}
