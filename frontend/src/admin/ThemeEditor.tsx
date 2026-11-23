import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  Monitor,
  PanelBottom,
  PanelTop,
  Palette,
  Plus,
  RotateCcw,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { adminPath, originForUrl, previewUrl, storefrontPath } from "../lib/deployment";
import { navigate } from "../lib/router";
import { defaultTheme } from "../lib/defaultTheme";
import type { ThemeState } from "../lib/repo";
import type { PreviewMessage } from "../storefront/StorefrontApp";
import { headingFonts, newSection, sectionSchemas, type FieldValue, type HeadingFont, type Section, type SectionType, type ThemeDocument, type ThemeSettings } from "../types/theme";
import { useAdmin } from "./AdminContext";
import { LinkInput, SettingsForm } from "./SettingsForm";
import { Badge, Button, ColorInput, Field, ImageInput, Input, Modal, Select, Textarea, Toggle } from "./ui";

type Panel = { kind: "list" } | { kind: "section"; id: string } | { kind: "header" } | { kind: "footer" } | { kind: "settings" };

const sectionIcon = (type: SectionType) => (type === "hero_slideshow" || type === "image_banner" ? "🖼️" : type === "product_carousel" ? "🛍️" : type === "collection_list" ? "🗂️" : type === "divider" ? "🎉" : type === "marquee" ? "📣" : type === "testimonials" ? "⭐" : type === "newsletter" ? "✉️" : "📝");

function sectionTitle(section: Section) {
  const heading = section.settings.heading;
  return typeof heading === "string" && heading ? heading : sectionSchemas[section.type].label;
}

export function ThemeEditor() {
  const { backend, toast, signIn } = useAdmin();
  const [state, setState] = useState<ThemeState | null>(null);
  const [theme, setTheme] = useState<ThemeDocument | null>(null);
  const [panel, setPanel] = useState<Panel>({ kind: "list" });
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState<"save" | "publish" | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const previewOrigin = originForUrl(previewUrl);

  useEffect(() => {
    backend.theme().then((t) => {
      setState(t);
      setTheme(structuredClone(t.draft));
    });
  }, [backend]);

  const selectedId = panel.kind === "section" ? panel.id : null;
  const dirty = Boolean(state && theme && JSON.stringify(state.draft) !== JSON.stringify(theme));
  const unpublished = Boolean(state && theme && JSON.stringify(state.published) !== JSON.stringify(theme));

  const postToPreview = useCallback(
    (reload = false) => {
      if (!theme) return;
      frame.current?.contentWindow?.postMessage({ type: "gd:theme", theme, selectedId, reload } satisfies PreviewMessage, previewOrigin);
    },
    [previewOrigin, theme, selectedId],
  );

  useEffect(() => postToPreview(), [postToPreview]);

  useEffect(() => {
    function onMessage(event: MessageEvent<PreviewMessage>) {
      if (event.origin !== previewOrigin) return;
      if (event.data?.type === "gd:ready") postToPreview();
      if (event.data?.type === "gd:select") setPanel({ kind: "section", id: event.data.id });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postToPreview, previewOrigin]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useCallback(
    async (publish: boolean) => {
      if (!theme) return;
      if (publish && backend.mode === "demo") {
        toast("Sign in to publish changes to the live storefront.", "error");
        signIn?.();
        return;
      }
      setSaving(publish ? "publish" : "save");
      try {
        let next = await backend.saveTheme(theme);
        if (publish) next = await backend.publishTheme();
        setState(next);
        toast(publish ? "Published! Your storefront is updated." : backend.mode === "demo" ? "Demo draft saved in this browser" : "Draft saved");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Could not save theme", "error");
      } finally {
        setSaving(null);
      }
    },
    [backend, signIn, theme, toast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  if (!theme || !state) {
    return <div className="grid h-screen place-items-center bg-admin-bg text-sm text-admin-muted">Loading theme editor…</div>;
  }

  const sections = theme.sections;
  const setSections = (next: Section[]) => setTheme({ ...theme, sections: next });
  const updateSection = (id: string, patch: Partial<Section>) => setSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateSettings = (patch: Partial<ThemeSettings>) => setTheme({ ...theme, settings: { ...theme.settings, ...patch } });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSections(next);
  };
  const insert = (type: SectionType, at: number) => {
    const section = newSection(type);
    setSections([...sections.slice(0, at), section, ...sections.slice(at)]);
    setPanel({ kind: "section", id: section.id });
    setAdding(null);
  };

  const selected = sections.find((s) => s.id === selectedId);
  const selectedIndex = selected ? sections.indexOf(selected) : -1;

  return (
    <div className="flex h-screen flex-col bg-admin-bg font-body text-admin-text">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-admin-line bg-white px-3">
        <button onClick={() => navigate(adminPath())} aria-label="Exit editor" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">Home page</span>
          {backend.mode === "demo" ? <Badge tone="info">Demo only</Badge> : unpublished ? <Badge tone="warning">Unpublished changes</Badge> : <Badge tone="success">Live</Badge>}
        </div>
        <div className="mx-auto hidden items-center rounded-lg bg-[#f1f1f1] p-0.5 md:flex">
          {(["desktop", "mobile"] as const).map((d) => (
            <button key={d} onClick={() => setDevice(d)} aria-label={`${d} preview`} aria-pressed={device === d} className={`grid h-8 w-10 place-items-center rounded-md ${device === d ? "bg-white shadow-sm" : "text-admin-muted"}`}>
              {d === "desktop" ? <Monitor size={16} /> : <Smartphone size={16} />}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button onClick={() => window.open(storefrontPath(), "_blank")} className="hidden sm:inline-flex">
            <Eye size={14} /> View store
          </Button>
          <Button onClick={() => save(false)} disabled={!dirty} loading={saving === "save"}>
            {backend.mode === "demo" ? (dirty ? "Save demo" : "Demo saved") : dirty ? "Save" : "Saved"}
          </Button>
          {backend.mode === "demo" ? (
            <Button variant="primary" onClick={signIn}>
              Sign in to publish
            </Button>
          ) : (
            <Button variant="primary" onClick={() => save(true)} disabled={!unpublished} loading={saving === "publish"}>
              Publish
            </Button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="flex w-full max-w-[340px] shrink-0 flex-col border-r border-admin-line bg-white">
          {panel.kind === "list" && (
            <>
              <div className="flex border-b border-admin-line">
                <button className="flex flex-1 items-center justify-center gap-1.5 border-b-2 border-admin-text py-2.5 text-[13px] font-semibold">
                  <LayoutTemplate size={14} /> Sections
                </button>
                <button onClick={() => setPanel({ kind: "settings" })} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] text-admin-muted hover:text-admin-text">
                  <Palette size={14} /> Theme settings
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <button onClick={() => setPanel({ kind: "header" })} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] hover:bg-black/[0.04]">
                  <PanelTop size={15} className="text-admin-muted" /> Header & announcement
                </button>
                <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-admin-muted">Template</p>
                <ul>
                  {sections.map((section, i) => (
                    <li
                      key={section.id}
                      draggable
                      onDragStart={() => setDragging(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragging !== null && dragging !== i) move(dragging, i);
                        setDragging(null);
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={`group relative flex items-center gap-1 rounded-lg px-1 ${dragging === i ? "opacity-40" : ""} hover:bg-black/[0.04]`}
                    >
                      <GripVertical size={14} className="shrink-0 cursor-grab text-admin-muted opacity-0 group-hover:opacity-100" />
                      <button onClick={() => setPanel({ kind: "section", id: section.id })} className={`flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-[13px] ${section.hidden ? "text-admin-muted line-through" : ""}`}>
                        <span aria-hidden="true">{sectionIcon(section.type)}</span>
                        <span className="truncate">{sectionTitle(section)}</span>
                      </button>
                      <button
                        onClick={() => updateSection(section.id, { hidden: !section.hidden })}
                        aria-label={section.hidden ? "Show section" : "Hide section"}
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded text-admin-muted hover:bg-black/5 ${section.hidden ? "" : "opacity-0 group-hover:opacity-100"}`}
                      >
                        {section.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => setAdding(i + 1)}
                        aria-label="Add section below"
                        className="absolute -bottom-2.5 left-1/2 z-10 hidden h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-[#2c6ecb] text-white shadow group-hover:grid"
                      >
                        <Plus size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button variant="plain" className="mt-1 w-full justify-start" onClick={() => setAdding(sections.length)}>
                  <Plus size={14} /> Add section
                </Button>
                <button onClick={() => setPanel({ kind: "footer" })} className="mt-2 flex w-full items-center gap-2 border-t border-admin-line px-2 pb-2 pt-3 text-left text-[13px] hover:bg-black/[0.04]">
                  <PanelBottom size={15} className="text-admin-muted" /> Footer
                </button>
              </div>
              <p className="border-t border-admin-line px-4 py-2.5 text-xs text-admin-muted">Tip: click any section in the preview to edit it. Drag to reorder.</p>
            </>
          )}

          {panel.kind !== "list" && (
            <div className="flex items-center gap-2 border-b border-admin-line px-2 py-2">
              <button onClick={() => setPanel({ kind: "list" })} aria-label="Back to sections" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5">
                <ArrowLeft size={16} />
              </button>
              <span className="flex-1 truncate text-[13px] font-semibold">
                {panel.kind === "section" && selected ? sectionSchemas[selected.type].label : panel.kind === "header" ? "Header" : panel.kind === "footer" ? "Footer" : "Theme settings"}
              </span>
              {selected && (
                <div className="flex">
                  <button onClick={() => move(selectedIndex, selectedIndex - 1)} disabled={selectedIndex === 0} aria-label="Move section up" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 disabled:opacity-30">
                    <ChevronUp size={16} />
                  </button>
                  <button onClick={() => move(selectedIndex, selectedIndex + 1)} disabled={selectedIndex === sections.length - 1} aria-label="Move section down" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 disabled:opacity-30">
                    <ChevronDown size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {panel.kind === "section" && !selected && <p className="p-4 text-sm text-admin-muted">This section was removed.</p>}

          {panel.kind === "section" && selected && (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="mb-4 text-xs text-admin-muted">{sectionSchemas[selected.type].description}</p>
                <SettingsForm fields={sectionSchemas[selected.type].fields} values={selected.settings} onChange={(patch: Record<string, FieldValue>) => updateSection(selected.id, { settings: { ...selected.settings, ...patch } })} />
              </div>
              <div className="flex gap-2 border-t border-admin-line p-3">
                <Button onClick={() => updateSection(selected.id, { hidden: !selected.hidden })}>{selected.hidden ? <Eye size={14} /> : <EyeOff size={14} />}{selected.hidden ? "Show" : "Hide"}</Button>
                <Button
                  onClick={() => {
                    const copy = { ...structuredClone(selected), id: newSection(selected.type).id };
                    setSections([...sections.slice(0, selectedIndex + 1), copy, ...sections.slice(selectedIndex + 1)]);
                    setPanel({ kind: "section", id: copy.id });
                  }}
                >
                  <Copy size={14} /> Duplicate
                </Button>
                <Button
                  className="ml-auto !text-[#c5280c]"
                  onClick={() => {
                    setSections(sections.filter((s) => s.id !== selected.id));
                    setPanel({ kind: "list" });
                  }}
                >
                  <Trash2 size={14} /> Remove
                </Button>
              </div>
            </>
          )}

          {panel.kind === "header" && <HeaderSettings settings={theme.settings} onChange={updateSettings} />}
          {panel.kind === "footer" && <FooterSettings settings={theme.settings} onChange={updateSettings} />}
          {panel.kind === "settings" && <GlobalSettings settings={theme.settings} onChange={updateSettings} onReset={() => setConfirmReset(true)} />}
        </aside>

        {/* Preview */}
        <div className="hidden min-w-0 flex-1 justify-center overflow-hidden p-3 md:flex">
          <iframe
            ref={frame}
            title="Storefront preview"
            src={previewUrl}
            className={`h-full rounded-lg border border-admin-line bg-white shadow-card transition-all duration-300 ${device === "mobile" ? "w-[390px]" : "w-full"}`}
          />
        </div>
      </div>

      {adding !== null && (
        <Modal title="Add section" onClose={() => setAdding(null)}>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(sectionSchemas) as SectionType[]).map((type) => (
              <button key={type} onClick={() => insert(type, adding)} className="flex items-start gap-3 rounded-lg border border-admin-line p-3 text-left transition hover:border-[#2c6ecb] hover:bg-[#2c6ecb]/[0.03]">
                <span className="text-xl" aria-hidden="true">
                  {sectionIcon(type)}
                </span>
                <span>
                  <span className="block text-[13px] font-semibold">{sectionSchemas[type].label}</span>
                  <span className="block text-xs text-admin-muted">{sectionSchemas[type].description}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {confirmReset && (
        <Modal
          title="Reset to the default layout?"
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  setTheme(structuredClone(defaultTheme));
                  setPanel({ kind: "list" });
                  setConfirmReset(false);
                }}
              >
                Reset
              </Button>
            </>
          }
        >
          <p className="text-sm">This replaces your current sections and settings in the editor. Nothing changes on the live store until you save and publish.</p>
        </Modal>
      )}
    </div>
  );
}

type SettingsProps = { settings: ThemeSettings; onChange(patch: Partial<ThemeSettings>): void };

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-admin-line p-4 last:border-0">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function HeaderSettings({ settings, onChange }: SettingsProps) {
  const { announcement, navigation } = settings;
  const setNav = (next: ThemeSettings["navigation"]) => onChange({ navigation: next });
  return (
    <div className="flex-1 overflow-y-auto">
      <Group title="Logo">
        <ImageInput value={settings.logo_url} onChange={(v) => onChange({ logo_url: v })} compact />
        <Field label={`Logo height: ${settings.logo_height}px`}>
          <input type="range" min={28} max={96} value={settings.logo_height} onChange={(e) => onChange({ logo_height: Number(e.target.value) })} className="accent-[#303030]" />
        </Field>
        <Field label="Store name" help="Shown when there's no logo, and in the footer." htmlFor="store-name">
          <Input id="store-name" value={settings.store_name} onChange={(e) => onChange({ store_name: e.target.value })} />
        </Field>
      </Group>
      <Group title="Announcement bar">
        <Toggle checked={announcement.enabled} onChange={(v) => onChange({ announcement: { ...announcement, enabled: v } })} label="Show announcement bar" />
        <Field label="Messages" help="One per line. Multiple messages rotate." htmlFor="ann-msg">
          <Textarea id="ann-msg" value={announcement.messages} onChange={(e) => onChange({ announcement: { ...announcement, messages: e.target.value } })} />
        </Field>
        <Field label="Link" htmlFor="ann-link">
          <LinkInput id="ann-link" value={announcement.link} onChange={(v) => onChange({ announcement: { ...announcement, link: v } })} />
        </Field>
        <Field label="Background">
          <ColorInput value={announcement.background} onChange={(v) => onChange({ announcement: { ...announcement, background: v } })} />
        </Field>
        <Field label="Text color">
          <ColorInput value={announcement.text_color} onChange={(v) => onChange({ announcement: { ...announcement, text_color: v } })} />
        </Field>
      </Group>
      <Group title="Main menu">
        <div className="flex flex-col gap-2">
          {navigation.map((item, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-admin-line p-2">
              <div className="flex items-center gap-1">
                <Input value={item.label} onChange={(e) => setNav(navigation.map((n, j) => (j === i ? { ...n, label: e.target.value } : n)))} placeholder="Label" aria-label="Menu label" />
                <button
                  onClick={() => {
                    if (i === 0) return;
                    const next = [...navigation];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    setNav(next);
                  }}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-black/5 disabled:opacity-30"
                >
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => setNav(navigation.filter((_, j) => j !== i))} aria-label="Remove menu item" className="grid h-8 w-8 shrink-0 place-items-center rounded text-admin-muted hover:bg-black/5 hover:text-[#c5280c]">
                  <X size={14} />
                </button>
              </div>
              <LinkInput value={item.href} onChange={(v) => setNav(navigation.map((n, j) => (j === i ? { ...n, href: v } : n)))} />
            </div>
          ))}
          <Button variant="plain" className="self-start" onClick={() => setNav([...navigation, { label: "New link", href: "/collections/all" }])}>
            <Plus size={14} /> Add menu item
          </Button>
        </div>
      </Group>
    </div>
  );
}

function FooterSettings({ settings, onChange }: SettingsProps) {
  const { footer } = settings;
  const set = (patch: Partial<ThemeSettings["footer"]>) => onChange({ footer: { ...footer, ...patch } });
  return (
    <div className="flex-1 overflow-y-auto">
      <Group title="About">
        <Textarea value={footer.about} onChange={(e) => set({ about: e.target.value })} aria-label="About text" />
        <Toggle checked={footer.show_newsletter} onChange={(v) => set({ show_newsletter: v })} label="Show newsletter signup" />
        <Field label="Copyright line" htmlFor="copyright">
          <Input id="copyright" value={footer.copyright} onChange={(e) => set({ copyright: e.target.value })} />
        </Field>
      </Group>
      <Group title="Link columns">
        {footer.columns.map((column, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-admin-line p-2">
            <div className="flex gap-1">
              <Input value={column.title} onChange={(e) => set({ columns: footer.columns.map((c, j) => (j === i ? { ...c, title: e.target.value } : c)) })} aria-label="Column title" />
              <button onClick={() => set({ columns: footer.columns.filter((_, j) => j !== i) })} aria-label="Remove column" className="grid h-9 w-9 shrink-0 place-items-center rounded text-admin-muted hover:bg-black/5 hover:text-[#c5280c]">
                <Trash2 size={14} />
              </button>
            </div>
            <Textarea value={column.links} onChange={(e) => set({ columns: footer.columns.map((c, j) => (j === i ? { ...c, links: e.target.value } : c)) })} className="min-h-[120px] font-mono text-xs" aria-label="Column links" />
          </div>
        ))}
        <p className="text-xs text-admin-muted">One link per line, written as “Label | /url”.</p>
        <Button variant="plain" className="self-start" onClick={() => set({ columns: [...footer.columns, { title: "New column", links: "Contact Us | /pages/contact" }] })}>
          <Plus size={14} /> Add column
        </Button>
      </Group>
      <Group title="Contact details">
        <Toggle checked={footer.show_contact} onChange={(v) => set({ show_contact: v })} label="Show contact block" />
        <Field label="Contact heading" htmlFor="contact-heading">
          <Input id="contact-heading" value={footer.contact_heading} onChange={(e) => set({ contact_heading: e.target.value })} placeholder="Get in touch" />
        </Field>
        <Toggle checked={footer.show_email} onChange={(v) => set({ show_email: v })} label="Show contact email" />
        <Field label="Contact email" htmlFor="contact-email">
          <Input id="contact-email" type="email" value={footer.contact_email} onChange={(e) => set({ contact_email: e.target.value })} placeholder="support@groovydudz.com" />
        </Field>
        <Toggle checked={footer.show_whatsapp} onChange={(v) => set({ show_whatsapp: v })} label="Show WhatsApp" />
        <Field label="WhatsApp number" htmlFor="wa" help="With country code, e.g. +91 98765 43210">
          <Input id="wa" value={footer.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
        </Field>
      </Group>
      <Group title="Social icons">
        <Toggle checked={footer.show_socials} onChange={(v) => set({ show_socials: v })} label="Show social icons" />
        <Field label="Instagram URL" htmlFor="ig">
          <Input id="ig" value={footer.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="https://instagram.com/…" />
        </Field>
        <Field label="Facebook URL" htmlFor="fb">
          <Input id="fb" value={footer.facebook} onChange={(e) => set({ facebook: e.target.value })} />
        </Field>
        <Field label="YouTube URL" htmlFor="yt">
          <Input id="yt" value={footer.youtube} onChange={(e) => set({ youtube: e.target.value })} />
        </Field>
      </Group>
    </div>
  );
}

function GlobalSettings({ settings, onChange, onReset }: SettingsProps & { onReset(): void }) {
  const { colors } = settings;
  const setColor = (key: keyof ThemeSettings["colors"], value: string) => onChange({ colors: { ...colors, [key]: value } });
  const colorFields: { key: keyof ThemeSettings["colors"]; label: string }[] = [
    { key: "brand", label: "Brand (buttons, badges, links)" },
    { key: "accent", label: "Accent (ribbons, highlights)" },
    { key: "background", label: "Page background" },
    { key: "text", label: "Text" },
    { key: "footer_background", label: "Footer background" },
    { key: "footer_text", label: "Footer text" },
  ];
  return (
    <div className="flex-1 overflow-y-auto">
      <Group title="Colors">
        {colorFields.map((f) => (
          <Field key={f.key} label={f.label}>
            <ColorInput value={colors[f.key]} onChange={(v) => setColor(f.key, v)} />
          </Field>
        ))}
      </Group>
      <Group title="Typography">
        <Field label="Heading font" htmlFor="font">
          <Select id="font" value={settings.heading_font} onChange={(e) => onChange({ heading_font: e.target.value as HeadingFont })}>
            {Object.entries(headingFonts).map(([key, f]) => (
              <option key={key} value={key}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
      </Group>
      <Group title="Start over">
        <p className="text-xs text-admin-muted">Restore the original GroovyDudz homepage layout.</p>
        <Button onClick={onReset} className="self-start">
          <RotateCcw size={14} /> Reset to default
        </Button>
      </Group>
    </div>
  );
}
