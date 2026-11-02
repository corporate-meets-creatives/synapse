import type { ReactNode } from "react";

// One heading pattern for every content section: title, optional one-line lede, then content.
// `compact` is for short prose sections (About, LSA) so text-only blocks don't float in empty space.
export function Section({ id, title, lede, children, compact = false }: { id: string; title: string; lede?: ReactNode; children: ReactNode; compact?: boolean }) {
  return (
    <section aria-labelledby={id} className={compact ? "pt-12" : "py-12 sm:py-16"}>
      <h2 id={id} className="text-2xl sm:text-3xl">{title}</h2>
      {lede && <p className="mt-3 max-w-2xl text-lg text-muted">{lede}</p>}
      <div className={compact ? "mt-4" : "mt-8"}>{children}</div>
    </section>
  );
}
