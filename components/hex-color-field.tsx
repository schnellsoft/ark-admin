"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HexColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = /^#([0-9a-fA-F]{6})$/.test(value) ? value : "#000000";
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="color"
          className="h-10 w-14 cursor-pointer p-1"
          value={pickerValue}
          aria-label={label}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1877F2"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="font-mono uppercase"
          aria-describedby={`${id}-hint`}
        />
      </div>
      <p id={`${id}-hint`} className="text-xs text-slate-500">
        Hex
      </p>
    </div>
  );
}
