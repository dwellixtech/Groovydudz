import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Package, Plus, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { adminPath, storefrontPath } from "../lib/deployment";
import { money, pricing, sized, slugify } from "../lib/format";
import { Link, navigate } from "../lib/router";
import type { Product, ProductInput } from "../types/api";
import { useAdmin } from "./AdminContext";
import { Badge, Button, Card, EmptyState, Field, ImageInput, Input, Modal, PageHeader, Select, Textarea } from "./ui";

const statusTone = { active: "success", draft: "info", archived: "neutral" } as const;

export function ProductList() {
  const { products, collections } = useAdmin();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Product["status"]>("all");
  const [collection, setCollection] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => (status === "all" || p.status === status) && (!collection || p.collection_ids.includes(collection)) && (!q || p.title.toLowerCase().includes(q) || (p.variants[0]?.sku ?? "").toLowerCase().includes(q)),
    );
  }, [products, query, status, collection]);

  const counts = { all: products.length, active: 0, draft: 0, archived: 0 };
  products.forEach((p) => counts[p.status]++);

  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <Button variant="primary" onClick={() => navigate(adminPath("products/new"))}>
            <Plus size={14} /> Add product
          </Button>
        }
      />
      <Card padded={false}>
        <div className="flex gap-1 overflow-x-auto border-b border-admin-line px-2 pt-2">
          {(["all", "active", "draft", "archived"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium capitalize ${status === s ? "bg-[#f1f1f1] text-admin-text" : "text-admin-muted hover:bg-black/[0.03]"}`}>
              {s} <span className="text-admin-muted">{counts[s]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-b border-admin-line p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or SKU" className="pl-9" />
          </div>
          <Select value={collection} onChange={(e) => setCollection(e.target.value)} className="sm:w-56">
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<Package size={36} />} title="No products found" text="Try changing the filters or add a new product." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-[#f7f7f7] text-xs text-admin-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Inventory</th>
                  <th className="px-3 py-2 font-medium">Collections</th>
                  <th className="px-4 py-2 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line">
                {filtered.map((p) => {
                  const { price, onSale, compare } = pricing(p);
                  const stock = p.variants[0]?.inventory_quantity ?? 0;
                  const names = collections.filter((c) => p.collection_ids.includes(c.id)).map((c) => c.title);
                  return (
                    <tr key={p.id} className="cursor-pointer hover:bg-[#f7f7f7]" onClick={() => navigate(adminPath(`products/${p.id}`))}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-admin-line bg-white">
                            {p.media[0] && <img src={sized(p.media[0].url, 120)} alt="" loading="lazy" className="h-full w-full object-contain" />}
                          </div>
                          <span className="line-clamp-2 max-w-md font-semibold text-admin-text">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                      </td>
                      <td className={`px-3 py-2.5 ${stock <= 0 ? "text-[#c5280c]" : stock < 10 ? "text-[#916a00]" : "text-admin-muted"}`}>{stock} in stock</td>
                      <td className="px-3 py-2.5 text-admin-muted">
                        <span className="line-clamp-1 max-w-[220px]" title={names.join(", ")}>
                          {names.length ? names.join(", ") : "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        {money(price)}
                        {onSale && <span className="ml-1.5 text-xs text-admin-muted line-through">{money(compare)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function emptyProduct(): ProductInput {
  return {
    title: "",
    slug: "",
    description: "",
    status: "draft",
    vendor: "GroovyDudz",
    product_type: "",
    seo: {},
    collection_ids: [],
    media: [],
    variants: [{ title: "Default", sku: "", price: "", compare_at_price: null, inventory_quantity: 0, weight_grams: null, options: {} }],
  };
}

function toInput({ id: _id, media, variants, ...rest }: Product): ProductInput {
  return {
    ...rest,
    seo: rest.seo ?? {},
    collection_ids: rest.collection_ids ?? [],
    media: media.map(({ url, alt_text, position }) => ({ url, alt_text, position })),
    variants: variants.map(({ id: _variantId, ...v }) => v),
  };
}

export function ProductEditor({ id }: { id: string | null }) {
  const { products, collections, backend, reload, toast } = useAdmin();
  const existing = id ? products.find((p) => p.id === id) : undefined;
  const initial = useMemo(() => (existing ? toInput(existing) : emptyProduct()), [existing]);
  const [form, setForm] = useState<ProductInput>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(existing));
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newImage, setNewImage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (id && !existing) {
    return <EmptyState icon={<Package size={36} />} title="Product not found" text="It may have been deleted." action={<Button onClick={() => navigate(adminPath("products"))}>Back to products</Button>} />;
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const variant = form.variants[0];
  const set = (patch: Partial<ProductInput>) => setForm((f) => ({ ...f, ...patch }));
  const setVariant = (patch: Partial<ProductInput["variants"][number]>) => setForm((f) => ({ ...f, variants: [{ ...f.variants[0], ...patch }, ...f.variants.slice(1)] }));
  const setMedia = (media: ProductInput["media"]) => set({ media: media.map((m, i) => ({ ...m, position: i })) });
  const moveMedia = (from: number, to: number) => {
    if (to < 0 || to >= form.media.length) return;
    const next = [...form.media];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setMedia(next);
  };

  async function save() {
    if (!form.title.trim()) return toast("Add a product title first.", "error");
    if (!variant.price || Number(variant.price) < 0) return toast("Add a valid price.", "error");
    const payload: ProductInput = {
      ...form,
      title: form.title.trim(),
      slug: form.slug || slugify(form.title),
      variants: [{ ...variant, compare_at_price: variant.compare_at_price || null, sku: variant.sku || null }],
    };
    setSaving(true);
    try {
      const saved = await backend.saveProduct(id, payload);
      await reload();
      setForm(toInput(saved));
      toast(id ? "Product saved" : "Product created");
      if (!id) navigate(adminPath(`products/${saved.id}`));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save product", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    try {
      await backend.deleteProduct(id);
      await reload();
      toast("Product deleted");
      navigate(adminPath("products"));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete product", "error");
    }
  }

  return (
    <>
      {dirty && (
        <div className="sticky top-14 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 bg-[#1a1a1a] px-4 py-2.5 text-white lg:-mx-8 lg:px-8">
          <span className="text-[13px] font-semibold">Unsaved changes</span>
          <div className="flex gap-2">
            <Button onClick={() => setForm(initial)} className="!border-white/20 !bg-transparent !text-white hover:!bg-white/10">
              Discard
            </Button>
            <Button onClick={save} loading={saving} className="!border-0 !bg-white !text-admin-text">
              Save
            </Button>
          </div>
        </div>
      )}
      <PageHeader
        title={existing ? existing.title : "Add product"}
        back={
          <Link href={adminPath("products")} aria-label="Back to products" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-black/5">
            <ArrowLeft size={18} />
          </Link>
        }
        badge={existing && <Badge tone={statusTone[existing.status]}>{existing.status}</Badge>}
        actions={
          existing && (
            <Button onClick={() => window.open(storefrontPath(`products/${existing.slug}`), "_blank")}>
              <ExternalLink size={14} /> View
            </Button>
          )
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-4">
              <Field label="Title" htmlFor="title">
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
                  placeholder="Unicorn theme birthday decoration kit – 52 pcs"
                />
              </Field>
              <Field label="Description" htmlFor="description">
                <Textarea id="description" value={form.description ?? ""} onChange={(e) => set({ description: e.target.value })} className="min-h-[200px]" placeholder="What's in the box, sizes, how to set it up…" />
              </Field>
            </div>
          </Card>

          <Card title="Media" actions={<Button variant="plain" onClick={() => setAdding(true)}>Add image</Button>}>
            {form.media.length === 0 ? (
              <button onClick={() => setAdding(true)} className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c9cccf] text-[13px] text-admin-muted hover:bg-[#f6f6f7]">
                <Plus size={18} />
                <span className="font-semibold text-admin-text">Add images</span>
                The first image is used as the product cover.
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {form.media.map((m, i) => (
                  <div key={m.url + i} className={`group relative overflow-hidden rounded-lg border border-admin-line bg-white ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                    <img src={sized(m.url, 400)} alt={m.alt_text ?? ""} className="aspect-square h-full w-full object-contain" />
                    {i === 0 && (
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-medium">
                        <Star size={10} /> Cover
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 p-1.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      <div className="flex gap-1">
                        <button onClick={() => moveMedia(i, i - 1)} disabled={i === 0} aria-label="Move earlier" className="grid h-7 w-7 place-items-center rounded bg-white/90 disabled:opacity-40">
                          <ChevronLeft size={14} />
                        </button>
                        <button onClick={() => moveMedia(i, i + 1)} disabled={i === form.media.length - 1} aria-label="Move later" className="grid h-7 w-7 place-items-center rounded bg-white/90 disabled:opacity-40">
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <button onClick={() => setMedia(form.media.filter((_, j) => j !== i))} aria-label="Remove image" className="grid h-7 w-7 place-items-center rounded bg-white/90 text-[#c5280c]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setAdding(true)} aria-label="Add image" className="grid aspect-square place-items-center rounded-lg border border-dashed border-[#c9cccf] text-admin-muted hover:bg-[#f6f6f7]">
                  <Plus size={20} />
                </button>
              </div>
            )}
          </Card>

          <Card title="Pricing">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price (₹)" htmlFor="price">
                <Input id="price" type="number" min="0" step="1" value={variant.price} onChange={(e) => setVariant({ price: e.target.value })} placeholder="499" />
              </Field>
              <Field label="Compare-at price (₹)" htmlFor="compare" help="Shown struck through to display a discount.">
                <Input id="compare" type="number" min="0" step="1" value={variant.compare_at_price ?? ""} onChange={(e) => setVariant({ compare_at_price: e.target.value || null })} placeholder="999" />
              </Field>
            </div>
          </Card>

          <Card title="Inventory & shipping">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="SKU" htmlFor="sku">
                <Input id="sku" value={variant.sku ?? ""} onChange={(e) => setVariant({ sku: e.target.value })} />
              </Field>
              <Field label="Quantity in stock" htmlFor="qty">
                <Input id="qty" type="number" min="0" value={variant.inventory_quantity} onChange={(e) => setVariant({ inventory_quantity: Math.max(0, Number(e.target.value)) })} />
              </Field>
              <Field label="Weight (grams)" htmlFor="weight">
                <Input id="weight" type="number" min="0" value={variant.weight_grams ?? ""} onChange={(e) => setVariant({ weight_grams: e.target.value ? Number(e.target.value) : null })} />
              </Field>
            </div>
          </Card>

          <Card title="Search engine listing">
            <div className="flex flex-col gap-4">
              <div className="rounded-lg bg-[#f7f7f7] p-3 text-[13px]">
                <p className="text-xs text-admin-muted">groovydudz.com › products › {form.slug || "…"}</p>
                <p className="text-[15px] text-[#1a0dab]">{form.seo.title || form.title || "Product title"}</p>
                <p className="line-clamp-2 text-admin-muted">{form.seo.description || form.description || "Description"}</p>
              </div>
              <Field label="Page title" htmlFor="seo-title">
                <Input id="seo-title" value={form.seo.title ?? ""} onChange={(e) => set({ seo: { ...form.seo, title: e.target.value } })} placeholder={form.title} />
              </Field>
              <Field label="Meta description" htmlFor="seo-desc">
                <Textarea id="seo-desc" value={form.seo.description ?? ""} onChange={(e) => set({ seo: { ...form.seo, description: e.target.value } })} />
              </Field>
              <Field label="URL handle" htmlFor="slug">
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: slugify(e.target.value) });
                  }}
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Status">
            <Select value={form.status} onChange={(e) => set({ status: e.target.value as Product["status"] })}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
            <p className="mt-2 text-xs text-admin-muted">Only active products appear on the storefront.</p>
          </Card>
          <Card title="Product organization">
            <div className="flex flex-col gap-4">
              <Field label="Product type" htmlFor="type">
                <Input id="type" value={form.product_type ?? ""} onChange={(e) => set({ product_type: e.target.value })} placeholder="e.g. Party Accessories" />
              </Field>
              <div>
                <p className="mb-2 text-[13px] font-medium">Collections</p>
                <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {collections.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[13px] hover:bg-black/[0.03]">
                      <input
                        type="checkbox"
                        checked={form.collection_ids.includes(c.id)}
                        onChange={(e) => set({ collection_ids: e.target.checked ? [...form.collection_ids, c.id] : form.collection_ids.filter((x) => x !== c.id) })}
                        className="h-4 w-4 accent-[#303030]"
                      />
                      {c.title}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          {existing && (
            <Button variant="secondary" onClick={() => setConfirmDelete(true)} className="!text-[#c5280c]">
              <Trash2 size={14} /> Delete product
            </Button>
          )}
          {!dirty && !existing && (
            <Button variant="primary" onClick={save} loading={saving}>
              Save product
            </Button>
          )}
        </div>
      </div>

      {adding && (
        <Modal
          title="Add image"
          onClose={() => setAdding(false)}
          footer={
            <>
              <Button onClick={() => setAdding(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!newImage}
                onClick={() => {
                  setMedia([...form.media, { url: newImage, alt_text: form.title, position: form.media.length }]);
                  setNewImage("");
                  setAdding(false);
                }}
              >
                Add
              </Button>
            </>
          }
        >
          <ImageInput value={newImage} onChange={setNewImage} />
        </Modal>
      )}
      {confirmDelete && (
        <Modal
          title="Delete product?"
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
          <p className="text-sm">This permanently deletes “{existing?.title}”. This can't be undone.</p>
        </Modal>
      )}
    </>
  );
}
