"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import { defaultMobileCrop } from "@/lib/slide-crop-client";
import type { MobileCrop } from "@/lib/slideshow-shared";
import { cn } from "@/lib/utils";

export function MobileCropEditor({
  imageUrl,
  value,
  onChange,
}: {
  imageUrl: string;
  value: MobileCrop | null;
  onChange: (crop: MobileCrop) => void;
}) {
  const { t } = useI18n();
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, left: 0, top: 0 });

  const crop = value;

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    function measure() {
      if (!img) return;
      setDisplay({ w: img.clientWidth, h: img.clientHeight });
      if (img.naturalWidth && img.naturalHeight) {
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        if (!value) {
          onChange(defaultMobileCrop(img.naturalWidth, img.naturalHeight));
        }
      }
    }
    img.addEventListener("load", measure);
    measure();
    return () => img.removeEventListener("load", measure);
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = natural.w && display.w ? natural.w / display.w : 1;

  function clamp(next: MobileCrop): MobileCrop {
    let { left, top, width, height } = next;
    width = Math.max(1, Math.min(width, natural.w));
    height = Math.round(width * (4 / 3));
    if (height > natural.h) {
      height = natural.h;
      width = Math.round(height * (3 / 4));
    }
    left = Math.max(0, Math.min(left, natural.w - width));
    top = Math.max(0, Math.min(top, natural.h - height));
    return {
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!crop) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragOrigin.current = {
      x: e.clientX,
      y: e.clientY,
      left: crop.left,
      top: crop.top,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !crop) return;
    const dx = (e.clientX - dragOrigin.current.x) * scale;
    const dy = (e.clientY - dragOrigin.current.y) * scale;
    onChange(
      clamp({
        ...crop,
        left: dragOrigin.current.left + dx,
        top: dragOrigin.current.top + dy,
      }),
    );
  }

  const softWarning = crop && crop.width < 1080;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">{t("slideshow.cropHint")}</p>
      <div
        className="relative inline-block max-w-full touch-none overflow-hidden rounded-lg border border-slate-700"
        style={{ touchAction: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={imageUrl} alt="" className="max-h-[420px] max-w-full" />
        {crop && natural.w > 0 ? (
          <div
            className={cn(
              "absolute border-2 border-teal-400 bg-teal-400/10",
              dragging && "cursor-grabbing",
            )}
            style={{
              left: crop.left / scale,
              top: crop.top / scale,
              width: crop.width / scale,
              height: crop.height / scale,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => setDragging(false)}
            role="presentation"
          />
        ) : null}
      </div>

      {crop ? (
        <div className="grid max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["left", crop.left],
              ["top", crop.top],
              ["width", crop.width],
              ["height", crop.height],
            ] as const
          ).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <Label>{key}</Label>
              <Input
                type="number"
                value={val}
                readOnly={key === "width" || key === "height"}
                onChange={(e) => {
                  if (key === "width" || key === "height") return;
                  onChange(
                    clamp({
                      ...crop,
                      [key]: Number(e.target.value.replace(/[^\d]/g, "")),
                    }),
                  );
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {softWarning ? (
        <p className="text-sm text-amber-300">{t("slideshow.cropSoft")}</p>
      ) : null}
    </div>
  );
}
