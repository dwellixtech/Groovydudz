import { ImagePlus, Link2, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { sized } from "../lib/format";
import { uploadImage } from "../lib/repo";
import { useAdmin } from "./AdminContext";

export const inputClass =
  "w-full rounded-lg border border-[#c9cccf] bg-white px-3 py-2 text-sm text-admin-text outline-none transition placeholder:text-[#8c9196] focus:border-[#2c6ecb] focus:ring-2 focus:ring-[#2c6ecb]/20 disabled:bg-[#f6f6f7]";

type Variant = "primary" | "secondary" | "plain" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-[#303030] text-white shadow-[inset_0_-1px_0_rgb(0_0_0/0.4)] hover:bg-[#1a1a1a] disabled:bg-[#b5b5b5]",
  secondary: "bg-white text-admin-text border border-[#c9cccf] shadow-sm hover:bg-[#f6f6f7] disabled:text-[#8c9196]",
  plain: "text-[#2c6ecb] hover:bg-[#2c6ecb]/5",
  danger: "bg-[#c5280c] text-white hover:bg-[#a21b06]",
};

export function Button({ variant = "secondary", loading, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ title, actions, children, className = "", padded = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`rounded-xl bg-white shadow-card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          {title && <h2 className="text-sm font-semibold text-admin-text">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function Field({ label, help, children, htmlFor }: { label: string; help?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-admin-text">
        {label}
      </label>
      {children}
      {help && <p className="text-xs text-admin-muted">{help}</p>}
    </div>
  );
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} className={`${inputClass} min-h-[88px] ${props.className ?? ""}`} />;
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`${inputClass} pr-8 ${props.className ?? ""}`} />;

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange(value: boolean): void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[13px] text-admin-text">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#303030]" : "bg-[#c9cccf]"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

const tones = {
  success: "bg-[#cdfee1] text-[#0c5132]",
  warning: "bg-[#ffeb78] text-[#4f4700]",
  neutral: "bg-[#e3e3e3] text-[#4a4a4a]",
  info: "bg-[#e0f0ff] text-[#00527c]",
  critical: "bg-[#fedad9] text-[#8e1f0b]",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium first-letter:uppercase ${tones[tone]}`}>{children}</span>;
}

export function ColorInput({ value, onChange }: { value: string; onChange(value: string): void }) {
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="flex items-center gap-2">
      <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[#c9cccf]" style={{ background: valid ? value : "repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 10px 10px" }}>
        <input type="color" value={valid ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pick color" />
      </label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="None" className="font-mono" />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear color" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-admin-muted hover:bg-black/5">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// Image field: upload (Supabase Storage when live) or paste a URL.
export function ImageInput({ value, onChange, compact = false }: { value: string; onChange(value: string): void; compact?: boolean }) {
  const { backend, toast } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, backend.mode));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files[0]);
        }}
        className={`group relative overflow-hidden rounded-lg border border-dashed border-[#c9cccf] bg-[#f6f6f7] ${compact ? "h-28" : "h-36"}`}
      >
        {value ? (
          <>
            <img src={sized(value, 600)} alt="" className="h-full w-full object-contain" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
              <Button onClick={() => fileRef.current?.click()}>Replace</Button>
              <Button onClick={() => onChange("")} aria-label="Remove image">
                <Trash2 size={14} />
              </Button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1 text-[13px] text-admin-muted hover:bg-black/[0.02]">
            {busy ? <Loader2 className="animate-spin" size={20} /> : <ImagePlus size={20} />}
            <span className="font-semibold text-admin-text">{busy ? "Uploading…" : "Add image"}</span>
            <span className="text-xs">or drop a file here</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {showUrl || (value && !value.startsWith("data:")) ? (
        <Input value={value.startsWith("data:") ? "" : value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" aria-label="Image URL" className="text-xs" />
      ) : (
        <button type="button" onClick={() => setShowUrl(true)} className="inline-flex items-center gap-1 self-start text-xs font-medium text-[#2c6ecb] hover:underline">
          <Link2 size={12} /> Use an image link instead
        </button>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose(): void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} aria-label="Close" />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-admin-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-admin-line px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="mb-2 text-admin-muted">{icon}</div>
      <p className="font-semibold text-admin-text">{title}</p>
      <p className="max-w-sm text-sm text-admin-muted">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, back, actions, badge }: { title: string; back?: ReactNode; actions?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {back}
        <h1 className="text-xl font-bold text-admin-text">{title}</h1>
        {badge}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
