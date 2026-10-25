import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { navigate, usePath } from "../lib/router";
import { Link } from "./Link";
import { savedToken } from "../lib/local";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Jellyfish({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2F5BEA" /><stop offset=".55" stopColor="#7B5CE6" /><stop offset="1" stopColor="#F2649B" />
        </linearGradient>
      </defs>
      <path d="M8 30C8 16 19 6 32 6s24 10 24 24c0 3-2 4-4 4H12c-2 0-4-1-4-4Z" fill="url(#bell)" />
      <ellipse cx="24" cy="18" rx="6" ry="3.5" fill="#fff" opacity=".35" />
      <g fill="none" stroke="#13A8A0" strokeWidth="3.5" strokeLinecap="round">
        <path d="M18 36c-3 6 3 9 0 16" /><path d="M28 36c-3 7 3 10 0 20" />
        <path d="M38 36c3 7-3 10 0 20" /><path d="M48 36c3 6-3 9 0 16" />
      </g>
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePath();
  const token = savedToken.get();
  const nav = [
    { to: "/start", label: "Find providers", active: path === "/start" || path.endsWith("/results") || path.includes("/providers/") },
    { to: token ? `/s/${token}/applications` : "/applications", label: "My applications", active: path.endsWith("/applications") || path.includes("/apply/") },
    { to: token ? `/s/${token}/profile` : "/start", label: "Business profile", active: path.endsWith("/profile") },
  ];
  return (
    <div className="min-h-screen">
      <header className="border-b border-mist bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-semibold text-ink no-underline">
            <Jellyfish size={34} /> Wellyfish
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm font-medium">
            {nav.map((n) => (
              <Link key={n.label} to={n.to}
                className={cx("rounded-full px-3 py-1.5 no-underline", n.active ? "bg-ink text-white" : "text-muted hover:bg-foam hover:text-ink")}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">{children}</main>
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet"; busy?: boolean };
export function Button({ variant = "primary", busy, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-ocean text-white hover:bg-ocean-deep",
        variant === "secondary" && "border-2 border-ocean bg-surface text-ocean hover:bg-foam",
        variant === "quiet" && "text-ocean underline-offset-4 hover:underline px-2",
        className,
      )}
    >
      {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}

export const ButtonLink = ({ to, variant = "primary", children }: { to: string; variant?: "primary" | "secondary"; children: ReactNode }) => (
  <Button variant={variant} onClick={() => navigate(to)}>{children}</Button>
);

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-panel border border-mist bg-surface p-5 sm:p-6", className)}>{children}</section>;
}

export function Badge({ tone, children }: { tone: "lagoon" | "jelly" | "coral" | "ocean"; children: ReactNode }) {
  const t = {
    lagoon: "bg-lagoon-soft text-[#0b6f6a]",
    jelly: "bg-jelly-soft text-[#5a3fc0]",
    coral: "bg-coral-soft text-coral-deep",
    ocean: "bg-[#e3ebfd] text-ocean-deep",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}

type FieldShell = { label: string; hint?: ReactNode; badge?: ReactNode; error?: string; id: string };
export function TextField({ label, hint, badge, error, id, ...rest }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2"><label htmlFor={id} className="font-semibold">{label}</label>{badge}</div>
      <input id={id} {...rest}
        className={cx("w-full rounded-field border bg-surface px-3.5 py-2.5 text-ink placeholder:text-muted/70", error ? "border-coral" : "border-mist")} />
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {error && <p className="text-sm font-medium text-coral-deep">{error}</p>}
    </div>
  );
}

export function TextArea({ label, hint, badge, error, id, ...rest }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2"><label htmlFor={id} className="font-semibold">{label}</label>{badge}</div>
      <textarea id={id} rows={4} {...rest}
        className={cx("w-full rounded-field border bg-surface px-3.5 py-2.5 text-ink placeholder:text-muted/70", error ? "border-coral" : "border-mist")} />
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {error && <p className="text-sm font-medium text-coral-deep">{error}</p>}
    </div>
  );
}

export function Select({ label, id, children, ...rest }: { label: string; id: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="font-semibold">{label}</label>
      <select id={id} {...rest} className="w-full rounded-field border border-mist bg-surface px-3.5 py-2.5 text-ink">{children}</select>
    </div>
  );
}

export function Notice({ tone = "ocean", title, children }: { tone?: "ocean" | "coral" | "lagoon" | "jelly"; title: string; children?: ReactNode }) {
  const t = { ocean: "border-ocean/30 bg-[#e3ebfd]", coral: "border-coral/40 bg-coral-soft", lagoon: "border-lagoon/40 bg-lagoon-soft", jelly: "border-jelly/30 bg-jelly-soft" }[tone];
  return (
    <div role={tone === "coral" ? "alert" : "status"} className={cx("rounded-field border px-4 py-3", t)}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-ink/90">{children}</div>}
    </div>
  );
}

// Step indicator for intake and application preparation.
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-8 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === current ? "step" : undefined}>
          <span className={cx("grid h-6 w-6 place-items-center rounded-full text-xs font-bold",
            i < current ? "bg-lagoon text-white" : i === current ? "bg-ocean text-white" : "bg-mist text-muted")}>
            {i < current ? "✓" : i + 1}
          </span>
          <span className={i === current ? "font-semibold text-ink" : "text-muted"}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

// Progress list for work that takes a few seconds (import, matching).
export function Progress({ stages, active }: { stages: string[]; active: number }) {
  return (
    <ul className="space-y-3" aria-live="polite">
      {stages.map((s, i) => (
        <li key={s} className="flex items-center gap-3">
          <span className={cx("grid h-7 w-7 place-items-center rounded-full text-sm",
            i < active ? "bg-lagoon text-white" : i === active ? "bg-jelly-soft" : "bg-mist")}>
            {i < active ? "✓" : i === active ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-jelly border-r-transparent" /> : ""}
          </span>
          <span className={i <= active ? "font-medium" : "text-muted"}>{s}</span>
        </li>
      ))}
    </ul>
  );
}

export const PageTitle = ({ children, sub }: { children: ReactNode; sub?: ReactNode }) => (
  <div className="mb-6 max-w-2xl">
    <h1 className="text-3xl sm:text-4xl">{children}</h1>
    {sub && <p className="mt-2 text-lg text-muted">{sub}</p>}
  </div>
);

export const Loading = ({ label = "Loading" }: { label?: string }) => (
  <p className="flex items-center gap-3 text-muted" role="status">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-jelly border-r-transparent" /> {label}…
  </p>
);
