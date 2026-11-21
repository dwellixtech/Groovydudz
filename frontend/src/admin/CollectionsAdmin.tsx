import { ArrowLeft, ExternalLink, FolderOpen, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { adminPath, storefrontPath } from "../lib/deployment";
import { sized, slugify } from "../lib/format";
import { Link, navigate } from "../lib/router";
import type { CollectionInput, Product, ProductInput } from "../types/api";
import { useAdmin } from "./AdminContext";
import { Badge, Button, Card, EmptyState, Field, ImageInput, Input, Modal, PageHeader, Textarea, Toggle } from "./ui";

export function CollectionList() {
  const { collections } = useAdmin();
  return (
    <>
      <PageHeader
        title="Collections"
        actions={
          <Button variant="primary" onClick={() => navigate(adminPath("collections/new"))}>
            <Plus size={14} /> Create collection
          </Button>
        }
      />
      <Card padded={false}>
        {collections.length === 0 ? (
          <EmptyState icon={<FolderOpen size={36} />} title="No collections yet" text="Group products into collections like “Birthday” or “Baby Shower” and feature them on your homepage." />
        ) : (
          <ul className="divide-y divide-admin-line">
            {collections.map((c) => (
              <li key={c.id}>
                <Link href={adminPath(`collections/${c.id}`)} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7f7f7]">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-admin-line bg-[#f6f6f7]">
                    {c.image_url && <img src={sized(c.image_url, 120)} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-admin-text">{c.title}</p>
                    <p className="text-xs text-admin-muted">/collections/{c.slug}</p>
                  </div>
                  <span className="text-[13px] text-admin-muted">{c.product_count} products</span>
                  {!c.is_visible && <Badge>Hidden</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

const toPayload = ({ id: _id, media, variants, ...rest }: Product): ProductInput => ({
  ...rest,
  media: media.map(({ url, alt_text, position }) => ({ url, alt_text, position })),
  variants: variants.map(({ id: _variantId, ...v }) => v),
});

export function CollectionEditor({ id }: { id: string | null }) {
  const { collections, products, backend, reload, toast } = useAdmin();
  const existing = id ? collections.find((c) => c.id === id) : undefined;
  const initial: CollectionInput = existing
    ? { title: existing.title, slug: existing.slug, description: existing.description ?? "", image_url: existing.image_url ?? "", position: existing.position, is_visible: existing.is_visible }
    : { title: "", slug: "", description: "", image_url: "", position: collections.length, is_visible: true };
  const [form, setForm] = useState<CollectionInput>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(existing));
  const initialMembers = useMemo(() => new Set(id ? products.filter((p) => p.collection_ids.includes(id)).map((p) => p.id) : []), [id, products]);
  const [members, setMembers] = useState<Set<string>>(initialMembers);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (id && !existing) {
    return <EmptyState icon={<FolderOpen size={36} />} title="Collection not found" text="It may have been deleted." action={<Button onClick={() => navigate(adminPath("collections"))}>Back</Button>} />;
  }

  const set = (patch: Partial<CollectionInput>) => setForm((f) => ({ ...f, ...patch }));
  const memberProducts = products.filter((p) => members.has(p.id));
  const candidates = products.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()));

  async function save() {
    if (!form.title.trim()) return toast("Add a collection title first.", "error");
    setSaving(true);
    try {
      const saved = await backend.saveCollection(id, { ...form, title: form.title.trim(), slug: form.slug || slugify(form.title), description: form.description || null, image_url: form.image_url || null });
      // Membership lives on products, so update only the products whose membership changed.
      const changed = products.filter((p) => members.has(p.id) !== p.collection_ids.includes(saved.id));
      for (const p of changed) {
        const collection_ids = members.has(p.id) ? [...p.collection_ids, saved.id] : p.collection_ids.filter((c) => c !== saved.id);
        await backend.saveProduct(p.id, { ...toPayload(p), collection_ids });
      }
      await reload();
      toast(id ? "Collection saved" : "Collection created");
      if (!id) navigate(adminPath(`collections/${saved.id}`));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save collection", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    try {
      await backend.deleteCollection(id);
      await reload();
      toast("Collection deleted");
      navigate(adminPath("collections"));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete collection", "error");
    }
  }

  return (
    <>
      <PageHeader
        title={existing ? existing.title : "Create collection"}
        back={
          <Link href={adminPath("collections")} aria-label="Back to collections" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5">
            <ArrowLeft size={18} />
          </Link>
        }
        actions={
          <>
            {existing && (
              <Button onClick={() => window.open(storefrontPath(`collections/${existing.slug}`), "_blank")}>
                <ExternalLink size={14} /> View
              </Button>
            )}
            <Button variant="primary" onClick={save} loading={saving}>
              Save
            </Button>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-4">
              <Field label="Title" htmlFor="c-title">
                <Input id="c-title" value={form.title} onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} placeholder="e.g. Unicorn theme" />
              </Field>
              <Field label="Description" htmlFor="c-desc" help="Shown at the top of the collection page.">
                <Textarea id="c-desc" value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field label="URL handle" htmlFor="c-slug" help={`groovydudz.com/collections/${form.slug || "…"}`}>
                <Input
                  id="c-slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: slugify(e.target.value) });
                  }}
                />
              </Field>
            </div>
          </Card>
          <Card title={`Products (${memberProducts.length})`} actions={<Button variant="plain" onClick={() => setPicking(true)}>Browse products</Button>} padded={false}>
            {memberProducts.length === 0 ? (
              <EmptyState icon={<FolderOpen size={28} />} title="No products yet" text="Add products to show them in this collection." />
            ) : (
              <ul className="mt-2 divide-y divide-admin-line">
                {memberProducts.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                    <img src={sized(p.media[0]?.url, 100)} alt="" className="h-9 w-9 rounded-md border border-admin-line bg-white object-contain" />
                    <span className="line-clamp-1 flex-1 text-[13px]">{p.title}</span>
                    {p.status !== "active" && <Badge tone="info">{p.status}</Badge>}
                    <button
                      onClick={() => setMembers((m) => new Set([...m].filter((x) => x !== p.id)))}
                      aria-label={`Remove ${p.title}`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-admin-muted hover:bg-black/5 hover:text-[#c5280c]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Visibility">
            <Toggle checked={form.is_visible} onChange={(v) => set({ is_visible: v })} label="Visible on storefront" />
          </Card>
          <Card title="Collection image">
            <ImageInput value={form.image_url ?? ""} onChange={(v) => set({ image_url: v })} />
            <p className="mt-2 text-xs text-admin-muted">Used on “Shop by collection” cards. Portrait images (4:5) look best.</p>
          </Card>
          {existing && (
            <Button onClick={() => setConfirmDelete(true)} className="!text-[#c5280c]">
              <Trash2 size={14} /> Delete collection
            </Button>
          )}
        </div>
      </div>

      {picking && (
        <Modal title="Add products" onClose={() => setPicking(false)} footer={<Button variant="primary" onClick={() => setPicking(false)}>Done</Button>}>
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className="pl-9" />
          </div>
          <ul className="divide-y divide-admin-line">
            {candidates.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={members.has(p.id)}
                    onChange={(e) =>
                      setMembers((m) => {
                        const next = new Set(m);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        return next;
                      })
                    }
                    className="h-4 w-4 accent-[#303030]"
                  />
                  <img src={sized(p.media[0]?.url, 100)} alt="" className="h-9 w-9 rounded-md border border-admin-line bg-white object-contain" />
                  <span className="line-clamp-1 text-[13px]">{p.title}</span>
                </label>
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {confirmDelete && (
        <Modal
          title="Delete collection?"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="danger" onClick={remove}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm">Products in “{existing?.title}” are kept; only the collection is removed. Homepage sections using it will show empty until you pick another collection.</p>
        </Modal>
      )}
    </>
  );
}
