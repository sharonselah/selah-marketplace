import type { ReactNode } from 'react';

export function LegalDoc({ title, updated, sections }: { title: string; updated: string; sections: { heading: string; body: ReactNode }[] }) {
  return (
    <article>
      <h1 className="text-title text-text">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-8 flex flex-col gap-8">
        {sections.map((s, i) => (
          <section key={s.heading}>
            <h2 className="text-heading text-text">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-muted">{s.body}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
