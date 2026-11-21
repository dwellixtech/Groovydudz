import { ArrowLeft, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { adminPath, storefrontPath } from "../lib/deployment";
import { slugify } from "../lib/format";
import { Link, navigate } from "../lib/router";
import type { PolicyInput } from "../types/api";
import { useAdmin } from "./AdminContext";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Textarea, Toggle } from "./ui";

function emptyPolicy(position: number): PolicyInput {
  return {
    title: "",
    slug: "",
    summary: "",
    body: "## Policy details\nAdd the policy content here.",
    position,
    is_visible: true,
  };
}

export function PolicyList() {
  const { policies } = useAdmin();
  return (
    <>
      <PageHeader
        title="Policies"
        actions={
          <Button variant="primary" onClick={() => navigate(adminPath("policies/new"))}>
            <Plus size={14} /> Add policy
          </Button>
        }
      />
      <Card padded={false}>
        {policies.length === 0 ? (
          <EmptyState icon={<FileText size={36} />} title="No policies yet" text="Create policy pages for shipping, returns, privacy, terms and cancellation." />
        ) : (
          <ul className="divide-y divide-admin-line">
            {policies.map((policy) => (
              <li key={policy.id}>
                <Link href={adminPath(`policies/${policy.id}`)} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7f7f7]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f1f1f1]">
                    <FileText size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-admin-text">{policy.title}</span>
                    <span className="block truncate text-xs text-admin-muted">/pages/{policy.slug}</span>
                  </span>
                  <Badge tone={policy.is_visible ? "success" : "neutral"}>{policy.is_visible ? "Visible" : "Hidden"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export function PolicyEditor({ id }: { id: string | null }) {
  const { policies, backend, reload, toast } = useAdmin();
  const existing = id ? policies.find((policy) => policy.id === id) : undefined;
  const initial = useMemo<PolicyInput>(
    () => (existing ? { title: existing.title, slug: existing.slug, summary: existing.summary, body: existing.body, position: existing.position, is_visible: existing.is_visible } : emptyPolicy(policies.length)),
    [existing, policies.length],
  );
  const [form, setForm] = useState<PolicyInput>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(existing));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (id && !existing) {
    return <EmptyState icon={<FileText size={36} />} title="Policy not found" text="It may have been deleted." action={<Button onClick={() => navigate(adminPath("policies"))}>Back to policies</Button>} />;
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (patch: Partial<PolicyInput>) => setForm((current) => ({ ...current, ...patch }));

  async function save() {
    if (!form.title.trim()) return toast("Add a policy title first.", "error");
    if (!form.body.trim()) return toast("Add policy content first.", "error");
    const payload: PolicyInput = {
      ...form,
      title: form.title.trim(),
      slug: form.slug || slugify(form.title),
      summary: form.summary.trim(),
      body: form.body.trim(),
    };
    setSaving(true);
    try {
      const saved = await backend.savePolicy(id, payload);
      await reload();
      toast(id ? "Policy saved" : "Policy created");
      if (!id) navigate(adminPath(`policies/${saved.id}`));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save policy", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    try {
      await backend.deletePolicy(id);
      await reload();
      toast("Policy deleted");
      navigate(adminPath("policies"));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete policy", "error");
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
        title={existing ? existing.title : "Add policy"}
        back={
          <Link href={adminPath("policies")} aria-label="Back to policies" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-black/5">
            <ArrowLeft size={18} />
          </Link>
        }
        badge={existing && <Badge tone={existing.is_visible ? "success" : "neutral"}>{existing.is_visible ? "Visible" : "Hidden"}</Badge>}
        actions={
          <>
            {existing && (
              <Button onClick={() => window.open(storefrontPath(`pages/${existing.slug}`), "_blank")}>
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
              <Field label="Title" htmlFor="policy-title">
                <Input id="policy-title" value={form.title} onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} placeholder="Shipping Policy" />
              </Field>
              <Field label="Summary" htmlFor="policy-summary" help="Shown under the page heading. Keep it short.">
                <Textarea id="policy-summary" value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
              </Field>
              <Field label="Policy content" htmlFor="policy-body" help="Use headings like ## Returns and blank lines between paragraphs.">
                <Textarea id="policy-body" value={form.body} onChange={(e) => set({ body: e.target.value })} className="min-h-[420px] font-mono text-xs leading-relaxed" />
              </Field>
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Publishing">
            <Toggle checked={form.is_visible} onChange={(is_visible) => set({ is_visible })} label="Visible on storefront" />
            <p className="mt-2 text-xs text-admin-muted">Hidden policies are not available to shoppers.</p>
          </Card>
          <Card title="Search & URL">
            <div className="flex flex-col gap-4">
              <Field label="URL handle" htmlFor="policy-slug" help={`/pages/${form.slug || "..."}`}>
                <Input
                  id="policy-slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: slugify(e.target.value) });
                  }}
                />
              </Field>
              <Field label="Sort position" htmlFor="policy-position">
                <Input id="policy-position" type="number" value={form.position} onChange={(e) => set({ position: Number(e.target.value) })} />
              </Field>
            </div>
          </Card>
          {existing && (
            <Button variant="secondary" onClick={() => setConfirmDelete(true)} className="!text-[#c5280c]">
              <Trash2 size={14} /> Delete policy
            </Button>
          )}
        </div>
      </div>

      {confirmDelete && (
        <Modal
          title="Delete policy?"
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
          <p className="text-sm">This permanently deletes "{existing?.title}". Footer links to this page may need to be updated separately in Online Store.</p>
        </Modal>
      )}
    </>
  );
}
