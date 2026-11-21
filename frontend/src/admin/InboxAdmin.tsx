import { Download, Inbox, Mail, MessageCircle, Phone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import { demoInbox } from "../lib/forms";
import type { Inquiry, InquiryStatus, Subscriber } from "../types/api";
import { useAdmin } from "./AdminContext";
import { Badge, Button, Card, EmptyState, PageHeader } from "./ui";

const kindLabel: Record<Inquiry["kind"], string> = {
  contact: "Contact",
  product: "Product help",
  tracking: "Order tracking",
  bulk: "Bulk order",
  corporate: "Corporate",
  planner: "Event planner",
  dealer: "Dealer",
};

const statusTone = { new: "info", in_progress: "warning", resolved: "success" } as const;
const statusLabel: Record<InquiryStatus, string> = { new: "New", in_progress: "In progress", resolved: "Resolved" };

const detailLabel = (key: string) => key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

// Prefixing cells that start with = + - @ stops spreadsheets from running submitted text as formulas.
function csv(rows: string[][]) {
  const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function InboxPage() {
  const { backend, toast } = useAdmin();
  const source = backend.mode === "live" ? api : demoInbox;
  const [tab, setTab] = useState<"messages" | "subscribers">("messages");
  const [filter, setFilter] = useState<"all" | InquiryStatus>("new");
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [i, s] = await Promise.all([source.inquiries(), source.subscribers()]);
      setInquiries(i);
      setSubscribers(s);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't load the inbox", "error");
      setInquiries([]);
      setSubscribers([]);
    }
  }, [source, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => (inquiries ?? []).filter((i) => filter === "all" || i.status === filter), [inquiries, filter]);
  const counts = useMemo(() => {
    const c = { all: 0, new: 0, in_progress: 0, resolved: 0 };
    (inquiries ?? []).forEach((i) => {
      c.all++;
      c[i.status]++;
    });
    return c;
  }, [inquiries]);

  async function setStatus(inquiry: Inquiry, status: InquiryStatus) {
    try {
      const updated = await source.updateInquiry(inquiry.id, status);
      setInquiries((list) => (list ?? []).map((i) => (i.id === inquiry.id ? updated : i)));
      toast(`Marked as ${statusLabel[status].toLowerCase()}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't update", "error");
    }
  }

  function exportSubscribers() {
    download("groovydudz-subscribers.csv", csv([["email", "source", "subscribed_at"], ...(subscribers ?? []).map((s) => [s.email, s.source ?? "", s.created_at])]));
  }

  return (
    <>
      <PageHeader
        title="Inbox"
        actions={
          tab === "subscribers" && subscribers?.length ? (
            <Button onClick={exportSubscribers}>
              <Download size={14} /> Export CSV
            </Button>
          ) : undefined
        }
      />
      <div className="mb-3 flex gap-1">
        {(["messages", "subscribers"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${tab === t ? "bg-white shadow-sm" : "text-admin-muted hover:bg-black/[0.04]"}`}>
            {t === "messages" ? `Messages${counts.new ? ` (${counts.new} new)` : ""}` : `Subscribers (${subscribers?.length ?? 0})`}
          </button>
        ))}
      </div>

      {tab === "messages" ? (
        <Card padded={false}>
          <div className="flex gap-1 overflow-x-auto border-b border-admin-line px-2 pt-2">
            {(["new", "in_progress", "resolved", "all"] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-[13px] font-medium ${filter === s ? "bg-[#f1f1f1] text-admin-text" : "text-admin-muted hover:bg-black/[0.03]"}`}>
                {s === "all" ? "All" : statusLabel[s]} <span className="text-admin-muted">{counts[s]}</span>
              </button>
            ))}
          </div>
          {!inquiries ? (
            <p className="p-4 text-[13px] text-admin-muted">Loading…</p>
          ) : shown.length === 0 ? (
            <EmptyState icon={<Inbox size={36} />} title={filter === "new" ? "You're all caught up" : "No messages here"} text="Messages from the Contact page and business enquiry forms show up here." />
          ) : (
            <ul className="divide-y divide-admin-line">
              {shown.map((i) => {
                const open = openId === i.id;
                return (
                  <li key={i.id}>
                    <button onClick={() => setOpenId(open ? null : i.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f7f7f7]" aria-expanded={open}>
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i.status === "new" ? "bg-[#2c6ecb]" : "bg-transparent"}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold">{i.name}</span>
                          <Badge>{kindLabel[i.kind]}</Badge>
                          <Badge tone={statusTone[i.status]}>{statusLabel[i.status]}</Badge>
                        </div>
                        <p className={`mt-0.5 text-[13px] text-admin-muted ${open ? "" : "line-clamp-1"}`}>{i.message}</p>
                      </div>
                      <span className="shrink-0 text-xs text-admin-muted">{new Date(i.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    </button>
                    {open && (
                      <div className="flex flex-col gap-4 px-4 pb-4 pl-9">
                        <div className="flex flex-wrap gap-2 text-[13px]">
                          <a href={`mailto:${i.email}?subject=${encodeURIComponent(`Re: your GroovyDudz ${kindLabel[i.kind].toLowerCase()} enquiry`)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-line bg-white px-2.5 py-1.5 hover:bg-[#f6f6f7]">
                            <Mail size={14} /> {i.email}
                          </a>
                          {i.phone && (
                            <>
                              <a href={`tel:${i.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-line bg-white px-2.5 py-1.5 hover:bg-[#f6f6f7]">
                                <Phone size={14} /> {i.phone}
                              </a>
                              <a href={`https://wa.me/${i.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-admin-line bg-white px-2.5 py-1.5 hover:bg-[#f6f6f7]">
                                <MessageCircle size={14} /> WhatsApp
                              </a>
                            </>
                          )}
                        </div>
                        {(i.topic || Object.keys(i.details).length > 0 || i.source_path) && (
                          <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
                            {i.topic && (
                              <div className="flex gap-2">
                                <dt className="text-admin-muted">Topic</dt>
                                <dd>{i.topic}</dd>
                              </div>
                            )}
                            {Object.entries(i.details).map(([k, v]) => (
                              <div key={k} className="flex gap-2">
                                <dt className="text-admin-muted">{detailLabel(k)}</dt>
                                <dd>{v}</dd>
                              </div>
                            ))}
                            {i.source_path && (
                              <div className="flex gap-2">
                                <dt className="text-admin-muted">Sent from</dt>
                                <dd className="font-mono text-xs leading-5">{i.source_path}</dd>
                              </div>
                            )}
                          </dl>
                        )}
                        <p className="whitespace-pre-line rounded-lg bg-[#f7f7f7] p-3 text-[13px] leading-relaxed">{i.message}</p>
                        <div className="flex gap-2">
                          {i.status !== "in_progress" && <Button onClick={() => setStatus(i, "in_progress")}>Mark in progress</Button>}
                          {i.status !== "resolved" && (
                            <Button variant="primary" onClick={() => setStatus(i, "resolved")}>
                              Mark resolved
                            </Button>
                          )}
                          {i.status === "resolved" && <Button onClick={() => setStatus(i, "new")}>Reopen</Button>}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : (
        <Card padded={false}>
          {!subscribers ? (
            <p className="p-4 text-[13px] text-admin-muted">Loading…</p>
          ) : subscribers.length === 0 ? (
            <EmptyState icon={<Mail size={36} />} title="No subscribers yet" text="People who sign up from the homepage or footer show up here." />
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f7f7f7] text-xs text-admin-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Signed up from</th>
                  <th className="px-4 py-2 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line">
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5">{s.email}</td>
                    <td className="px-3 py-2.5 capitalize text-admin-muted">{s.source ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-admin-muted">{new Date(s.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
}
