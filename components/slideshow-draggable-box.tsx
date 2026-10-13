"use client";

import { useRef } from "react";
import { clampLayerRect, type LayerRect } from "@/lib/slideshow-shared";

type DraggableBoxProps = {
  box: LayerRect;
  onChange: (box: LayerRect) => void;
  aspectRatio?: number;
  lockAspect?: boolean;
  label?: string;
  minSize?: number;
};

export function SlideshowDraggableBox({
  box,
  onChange,
  aspectRatio,
  lockAspect = false,
  label = "Region",
  minSize = 10,
}: DraggableBoxProps) {
  const frameRef = useRef<HTMLDivElement>(null);

  const updateFromPointer = (
    event: PointerEvent,
    mode: "move" | "resize",
    origin: LayerRect & { px: number; py: number },
  ) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const dx = ((event.clientX - origin.px) / rect.width) * 100;
    const dy = ((event.clientY - origin.py) / rect.height) * 100;

    if (mode === "move") {
      onChange(
        clampLayerRect({
          ...origin,
          left: origin.left + dx,
          top: origin.top + dy,
        }),
      );
      return;
    }

    let width = origin.width + dx;
    let height = origin.height + dy;
    if (lockAspect && aspectRatio) {
      const frameRatio = rect.width / Math.max(1, rect.height);
      height = width / aspectRatio / (1 / frameRatio);
    }
    width = Math.max(minSize, width);
    height = Math.max(minSize, height);
    onChange(
      clampLayerRect({
        left: origin.left,
        top: origin.top,
        width,
        height,
      }),
    );
  };

  const start = (event: React.PointerEvent, mode: "move" | "resize") => {
    event.preventDefault();
    event.stopPropagation();
    const origin = {
      ...box,
      px: event.clientX,
      py: event.clientY,
    };
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const move = (next: PointerEvent) => updateFromPointer(next, mode, origin);
    const end = () => {
      target.releasePointerCapture(event.pointerId);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
  };

  return (
    <div ref={frameRef} className="absolute inset-0 touch-none">
      <div
        role="presentation"
        aria-label={label}
        className="absolute cursor-move rounded-md border-2 border-teal-400/90 bg-teal-500/20 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        style={{
          left: `${box.left}%`,
          top: `${box.top}%`,
          width: `${box.width}%`,
          height: `${box.height}%`,
        }}
        onPointerDown={(event) => start(event, "move")}
      >
        <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/55 px-2 py-0.5 text-[10px] tracking-wider text-teal-200 uppercase">
          {label}
        </span>
        <button
          type="button"
          aria-label="Resize region"
          className="absolute right-0 bottom-0 size-4 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-sm border border-teal-300 bg-slate-900"
          onPointerDown={(event) => start(event, "resize")}
        />
      </div>
    </div>
  );
}
