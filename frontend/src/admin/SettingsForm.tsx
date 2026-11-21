import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { Field as FieldDef, FieldValue } from "../types/theme";
import { useAdmin } from "./AdminContext";
import { Button, ColorInput, Field, ImageInput, Input, Select, Textarea, Toggle } from "./ui";

type Values = Record<string, FieldValue>;

// Text input with suggestions for internal pages (collections, all products, home).
export function LinkInput({ value, onChange, id }: { value: string; onChange(value: string): void; id?: string }) {
  const { collections } = useAdmin();
  const listId = "gd-link-suggestions";
  return (
    <>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} list={listId} placeholder="/collections/… or https://…" />
      <datalist id={listId}>
        <option value="/">Home</option>
        <option value="/collections/all">All products</option>
        {collections.map((c) => (
          <option key={c.id} value={`/collections/${c.slug}`}>
            {c.title}
          </option>
        ))}
      </datalist>
    </>
  );
}

function CollectionPicker({ value, onChange, multiple }: { value: string | string[]; onChange(value: string | string[]): void; multiple?: boolean }) {
  const { collections } = useAdmin();
  if (!multiple) {
    return (
      <Select value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}>
        <option value="all">All products</option>
        {collections.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.title} ({c.product_count})
          </option>
        ))}
      </Select>
    );
  }
  const selected = Array.isArray(value) ? value : [];
  const move = (i: number, d: number) => {
    const next = [...selected];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      {selected.map((slug, i) => {
        const c = collections.find((x) => x.slug === slug);
        return (
          <div key={slug} className="flex items-center gap-1 rounded-lg border border-admin-line bg-white px-2 py-1.5 text-[13px]">
            <span className={`flex-1 truncate ${c ? "" : "text-[#c5280c]"}`}>{c?.title ?? `${slug} (missing)`}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="grid h-6 w-6 place-items-center rounded disabled:opacity-30 hover:bg-black/5">
              <ChevronUp size={14} />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} aria-label="Move down" className="grid h-6 w-6 place-items-center rounded disabled:opacity-30 hover:bg-black/5">
              <ChevronDown size={14} />
            </button>
            <button type="button" onClick={() => onChange(selected.filter((s) => s !== slug))} aria-label="Remove" className="grid h-6 w-6 place-items-center rounded text-admin-muted hover:bg-black/5 hover:text-[#c5280c]">
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
      <Select value="" onChange={(e) => e.target.value && onChange([...selected, e.target.value])}>
        <option value="">+ Add a collection</option>
        {collections
          .filter((c) => !selected.includes(c.slug))
          .map((c) => (
            <option key={c.id} value={c.slug}>
              {c.title}
            </option>
          ))}
      </Select>
      {selected.length === 0 && <p className="text-xs text-admin-muted">Nothing selected: the first four collections are shown.</p>}
    </div>
  );
}

function Blocks({ field, value, onChange }: { field: Extract<FieldDef, { type: "blocks" }>; value: Values[]; onChange(value: Values[]): void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const update = (i: number, patch: Values) => onChange(value.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  const reorder = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {value.map((item, i) => {
        const title = String(item[field.titleKey] || "") || `${field.itemLabel} ${i + 1}`;
        const thumb = typeof item.image === "string" ? item.image : "";
        return (
          <div
            key={i}
            draggable
            onDragStart={() => setDragging(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging !== null && dragging !== i) reorder(dragging, i);
              setDragging(null);
            }}
            className={`rounded-lg border bg-white ${open === i ? "border-[#2c6ecb]" : "border-admin-line"} ${dragging === i ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-1 px-1.5 py-1.5">
              <GripVertical size={14} className="shrink-0 cursor-grab text-admin-muted" />
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px]">
                {thumb && <img src={thumb} alt="" className="h-7 w-10 shrink-0 rounded object-cover" />}
                <span className="truncate">{title}</span>
              </button>
              <button type="button" onClick={() => onChange([...value.slice(0, i + 1), structuredClone(item), ...value.slice(i + 1)])} aria-label={`Duplicate ${title}`} className="grid h-7 w-7 place-items-center rounded text-admin-muted hover:bg-black/5">
                <Copy size={13} />
              </button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${title}`} className="grid h-7 w-7 place-items-center rounded text-admin-muted hover:bg-black/5 hover:text-[#c5280c]">
                <Trash2 size={13} />
              </button>
            </div>
            {open === i && (
              <div className="border-t border-admin-line p-3">
                <SettingsForm fields={field.fields} values={item} onChange={(patch) => update(i, patch)} />
              </div>
            )}
          </div>
        );
      })}
      <Button
        variant="plain"
        className="self-start"
        onClick={() => {
          onChange([...value, structuredClone(field.defaults)]);
          setOpen(value.length);
        }}
      >
        <Plus size={14} /> Add {field.itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}

export function SettingsForm({ fields, values, onChange }: { fields: FieldDef[]; values: Values; onChange(patch: Values): void }) {
  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => {
        const value = values[field.key];
        const id = `f-${field.key}`;
        const str = typeof value === "string" ? value : "";
        switch (field.type) {
          case "toggle":
            return <Toggle key={field.key} checked={value === true} onChange={(v) => onChange({ [field.key]: v })} label={field.label} />;
          case "blocks":
            return (
              <Field key={field.key} label={field.label}>
                <Blocks field={field} value={Array.isArray(value) ? (value as Values[]) : []} onChange={(v) => onChange({ [field.key]: v })} />
              </Field>
            );
          case "collection":
          case "collections":
            return (
              <Field key={field.key} label={field.label}>
                <CollectionPicker value={(value as string | string[]) ?? ""} multiple={field.type === "collections"} onChange={(v) => onChange({ [field.key]: v })} />
              </Field>
            );
          case "select":
            return (
              <Field key={field.key} label={field.label} htmlFor={id}>
                <Select id={id} value={str} onChange={(e) => onChange({ [field.key]: e.target.value })}>
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          case "number":
            return (
              <Field key={field.key} label={field.label} htmlFor={id}>
                <Input id={id} type="number" min={field.min} max={field.max} step={field.step ?? 1} value={typeof value === "number" ? value : ""} onChange={(e) => onChange({ [field.key]: e.target.value === "" ? 0 : Number(e.target.value) })} />
              </Field>
            );
          case "image":
            return (
              <Field key={field.key} label={field.label} help={field.help}>
                <ImageInput value={str} onChange={(v) => onChange({ [field.key]: v })} compact />
              </Field>
            );
          case "color":
            return (
              <Field key={field.key} label={field.label} help={field.help}>
                <ColorInput value={str} onChange={(v) => onChange({ [field.key]: v })} />
              </Field>
            );
          case "link":
            return (
              <Field key={field.key} label={field.label} htmlFor={id} help={field.help}>
                <LinkInput id={id} value={str} onChange={(v) => onChange({ [field.key]: v })} />
              </Field>
            );
          case "textarea":
            return (
              <Field key={field.key} label={field.label} htmlFor={id} help={field.help}>
                <Textarea id={id} value={str} placeholder={field.placeholder} onChange={(e) => onChange({ [field.key]: e.target.value })} />
              </Field>
            );
          default:
            return (
              <Field key={field.key} label={field.label} htmlFor={id} help={field.help}>
                <Input id={id} value={str} placeholder={field.placeholder} onChange={(e) => onChange({ [field.key]: e.target.value })} />
              </Field>
            );
        }
      })}
    </div>
  );
}
