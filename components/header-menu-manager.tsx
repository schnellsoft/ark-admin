"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { HexColorField } from "@/components/hex-color-field";
import { HeaderStripSettingsForm } from "@/components/header-strip-settings-form";
import { IconPickerPanel } from "@/components/icon-picker-panel";
import { MultilingualTextEditor } from "@/components/multilingual-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  asMenuLabel,
  emptyMenuItem,
  HEADER_MENU_MAX_DEPTH,
  menuLabelText,
  validateMenuItemDraft,
  type HeaderMenuItem,
  type HeaderMenuSettings,
} from "@/lib/header-menu-shared";
import type { IconRow } from "@/lib/icons";
import { cn } from "@/lib/utils";

function moveSibling(items: HeaderMenuItem[], id: string, direction: -1 | 1): HeaderMenuItem[] {
  const index = items.findIndex((i) => i.id === id);
  if (index >= 0) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    return next.map((item, i) => ({ ...item, position: i + 1 }));
  }
  return items.map((item) => ({
    ...item,
    items: moveSibling(item.items ?? [], id, direction),
  }));
}

function MenuItemForm({
  draft,
  setDraft,
  libraryIcons,
  hasChildren,
  depth,
}: {
  draft: Partial<HeaderMenuItem>;
  setDraft: (d: Partial<HeaderMenuItem>) => void;
  libraryIcons: IconRow[];
  hasChildren: boolean;
  depth: number;
}) {
  const { t } = useI18n();
  const [pickerOpen, setPickerOpen] = useState(false);
  const previewId = useId();
  const previewSvg =
    draft.svg || libraryIcons.find((icon) => icon.id === draft.icon_id)?.svg || "";

  return (
    <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
      <p className="text-xs text-slate-500">
        {t("headerMenu.level")} {depth}/{HEADER_MENU_MAX_DEPTH}
      </p>

      <fieldset className="space-y-3 rounded-xl border border-slate-700 p-4">
        <legend className="px-1 text-sm font-medium text-teal-200">
          {t("headerIcons.selectIcon")}
        </legend>
        <div className="flex flex-wrap items-center gap-4">
          <div
            id={previewId}
            className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-600 bg-slate-900 text-teal-300"
          >
            {previewSvg ? (
              <span
                className="inline-flex h-full w-full items-center justify-center [&_svg]:h-9 [&_svg]:w-9"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <span className="text-[10px] text-slate-500">—</span>
            )}
          </div>
          <div className="space-y-1">
            <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
              {t("headerIcons.selectIcon")}
            </Button>
            <p className="text-xs text-slate-500">
              {draft.name ? draft.name : t("headerIcons.noIcon")}
            </p>
            {draft.icon_id ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDraft({ ...draft, icon_id: null, name: "", svg: "" })
                }
              >
                {t("headerMenu.clearIcon")}
              </Button>
            ) : null}
          </div>
        </div>
      </fieldset>

      <MultilingualTextEditor
        label={`${t("field.label")} *`}
        value={asMenuLabel(draft.label)}
        onChange={(label) => setDraft({ ...draft, label })}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>{t("headerIcons.ariaLabel")}</Label>
          <Input
            value={draft.aria_label ?? ""}
            onChange={(e) => setDraft({ ...draft, aria_label: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>{t("headerIcons.description")}</Label>
          <Input
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>{t("field.href")}</Label>
          <Input
            value={hasChildren ? "#" : (draft.link ?? "")}
            onChange={(e) => setDraft({ ...draft, link: e.target.value })}
            placeholder="#"
            disabled={hasChildren}
            aria-describedby={hasChildren ? "menu-link-locked" : undefined}
          />
          {hasChildren ? (
            <p id="menu-link-locked" className="text-xs text-amber-400/90">
              {t("headerMenu.linkLocked")}
            </p>
          ) : null}
        </div>
        <HexColorField
          id="menu-item-color"
          label={t("headerIcons.color")}
          value={draft.color ?? ""}
          onChange={(color) => setDraft({ ...draft, color })}
        />
        <HexColorField
          id="menu-item-color-hover"
          label={t("headerIcons.colorHover")}
          value={draft.color_hover ?? ""}
          onChange={(color_hover) => setDraft({ ...draft, color_hover })}
        />
      </div>

      <IconPickerPanel
        icons={libraryIcons}
        selectedId={draft.icon_id}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(icon) =>
          setDraft({
            ...draft,
            icon_id: icon.id,
            name: icon.name,
            svg: icon.svg,
          })
        }
      />
    </div>
  );
}

function MenuLevel({
  items,
  depth,
  parentId,
  libraryIcons,
  expanded,
  setExpanded,
  editingId,
  setEditingId,
  draft,
  setDraft,
  onChange,
}: {
  items: HeaderMenuItem[];
  depth: number;
  parentId: string | null;
  libraryIcons: IconRow[];
  expanded: Set<string>;
  setExpanded: (next: Set<string>) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  draft: Partial<HeaderMenuItem> | null;
  setDraft: (d: Partial<HeaderMenuItem> | null) => void;
  onChange: (items: HeaderMenuItem[]) => void;
}) {
  const { t, locale } = useI18n();
  const canAddChildren = depth < HEADER_MENU_MAX_DEPTH;

  function startCreate() {
    setEditingId(`new:${parentId ?? "root"}`);
    setDraft({
      ...emptyMenuItem(),
      parent_id: parentId,
      id: crypto.randomUUID(),
    });
  }

  function startEdit(item: HeaderMenuItem) {
    setEditingId(item.id);
    setDraft({ ...item });
  }

  function submitDraft() {
    if (!draft?.id) return;
    const hasChildren =
      editingId && !editingId.startsWith("new:")
        ? (items.find((i) => i.id === editingId)?.items?.length ?? 0) > 0
        : false;
    const error = validateMenuItemDraft(draft, { hasChildren });
    if (error) {
      window.alert(t("headerMenu.labelRequired"));
      return;
    }
    const row: HeaderMenuItem = {
      id: draft.id,
      parent_id: parentId,
      icon_id: draft.icon_id ?? null,
      name: draft.name ?? "",
      label: asMenuLabel(draft.label),
      description: draft.description ?? "",
      aria_label: draft.aria_label ?? "",
      link: hasChildren ? "#" : draft.link?.trim() || "#",
      color: draft.color ?? "",
      color_hover: draft.color_hover ?? "",
      position: draft.position ?? items.length + 1,
      svg: draft.svg ?? null,
      items:
        editingId && !editingId.startsWith("new:")
          ? (items.find((i) => i.id === editingId)?.items ?? [])
          : [],
    };

    if (editingId?.startsWith("new:")) {
      onChange([...items, row]);
    } else {
      onChange(items.map((i) => (i.id === row.id ? { ...row, items: i.items } : i)));
    }
    setDraft(null);
    setEditingId(null);
  }

  const isCreatingHere = editingId === `new:${parentId ?? "root"}`;

  return (
    <div className={cn("space-y-2", depth > 1 && "ml-4 border-l border-slate-700 pl-3")}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={startCreate}>
          <Plus className="h-3.5 w-3.5" />
          {t("grid.add")}
        </Button>
      </div>

      {isCreatingHere && draft ? (
        <div className="space-y-3">
          <MenuItemForm
            draft={draft}
            setDraft={setDraft}
            libraryIcons={libraryIcons}
            hasChildren={false}
            depth={depth}
          />
          <div className="flex gap-2">
            <Button type="button" onClick={submitDraft}>
              {t("grid.add")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(null);
                setEditingId(null);
              }}
            >
              {t("grid.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {items.map((item) => {
        const open = expanded.has(item.id);
        const childCount = item.items?.length ?? 0;
        const isEditing = editingId === item.id;
        return (
          <div key={item.id} className="space-y-2 rounded-lg border border-slate-700/80 p-2">
            <div className="flex flex-wrap items-center gap-2">
              {canAddChildren ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    const next = new Set(expanded);
                    if (open) next.delete(item.id);
                    else next.add(item.id);
                    setExpanded(next);
                  }}
                  aria-expanded={open}
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <span className="inline-block w-8" />
              )}
              {item.svg ? (
                <span
                  className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-slate-800 text-teal-300 [&_svg]:h-5 [&_svg]:w-5"
                  style={item.color ? { color: item.color } : undefined}
                  dangerouslySetInnerHTML={{ __html: item.svg }}
                />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-xs text-slate-500">
                  —
                </span>
              )}
              <span className="min-w-0 flex-1 truncate font-medium text-teal-200">
                {menuLabelText(item.label, locale) || item.name || "—"}
              </span>
              <code className="text-xs text-slate-500">{item.link}</code>
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>
                {t("grid.edit")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange(moveSibling(items, item.id, -1))}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange(moveSibling(items, item.id, 1))}
              >
                ↓
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-rose-400"
                onClick={() => {
                  if (window.confirm(t("headerMenu.confirmDelete"))) {
                    onChange(items.filter((i) => i.id !== item.id));
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {isEditing && draft ? (
              <div className="space-y-3">
                <MenuItemForm
                  draft={draft}
                  setDraft={setDraft}
                  libraryIcons={libraryIcons}
                  hasChildren={childCount > 0}
                  depth={depth}
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={submitDraft}>
                    {t("grid.save")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDraft(null);
                      setEditingId(null);
                    }}
                  >
                    {t("grid.cancel")}
                  </Button>
                </div>
              </div>
            ) : null}

            {canAddChildren && open ? (
              <MenuLevel
                items={item.items ?? []}
                depth={depth + 1}
                parentId={item.id}
                libraryIcons={libraryIcons}
                expanded={expanded}
                setExpanded={setExpanded}
                editingId={editingId}
                setEditingId={setEditingId}
                draft={draft}
                setDraft={setDraft}
                onChange={(children) => {
                  const next = items.map((row) =>
                    row.id === item.id
                      ? {
                          ...row,
                          link: children.length > 0 ? "#" : row.link,
                          items: children,
                        }
                      : row,
                  );
                  onChange(next);
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function HeaderMenuManager({
  initialSettings,
  initialMenu,
  libraryIcons,
}: {
  initialSettings: HeaderMenuSettings;
  initialMenu: HeaderMenuItem[];
  libraryIcons: IconRow[];
}) {
  const { t } = useI18n();
  const [menu, setMenu] = useState(initialMenu);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<HeaderMenuItem> | null>(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  const settingsInitial = useMemo(
    () => ({
      more: initialSettings.more,
      maxWidth: initialSettings.maxWidth,
      color: initialSettings.color,
      colorHover: initialSettings.colorHover,
    }),
    [initialSettings],
  );

  async function saveMenu() {
    setPending(true);
    setStatus(t("grid.saving"));
    try {
      const res = await fetch("/api/site/header/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu }),
      });
      const data = (await res.json()) as { menu?: HeaderMenuItem[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? t("grid.saveFailed"));
      setMenu(data.menu ?? menu);
      setStatus(t("grid.saved"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("grid.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <HeaderStripSettingsForm
        title={t("headerMenu.settings")}
        initial={settingsInitial}
        saveUrl="/api/site/header/menu"
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-teal-200">{t("headerMenu.list")}</h2>
          <Button type="button" onClick={saveMenu} disabled={pending}>
            {pending ? t("grid.saving") : t("grid.save")}
          </Button>
        </div>
        <p className="text-sm text-slate-400">{t("headerMenu.listHint")}</p>
        <MenuLevel
          items={menu}
          depth={1}
          parentId={null}
          libraryIcons={libraryIcons}
          expanded={expanded}
          setExpanded={setExpanded}
          editingId={editingId}
          setEditingId={setEditingId}
          draft={draft}
          setDraft={setDraft}
          onChange={setMenu}
        />
        {status ? <p className="text-sm text-slate-400" aria-live="polite">{status}</p> : null}
      </div>
    </div>
  );
}
