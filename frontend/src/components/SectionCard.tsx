import clsx from "clsx";
import { PropsWithChildren, ReactNode } from "react";

type Props = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}>;

export function SectionCard({ title, eyebrow, description, action, className, children }: Props) {
  return (
    <section className={clsx("section-card", className)}>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <h2 className="headline-balance text-[1.7rem] font-semibold tracking-[-0.03em] text-ink">{title}</h2>
          {description ? <p className="copy-pretty max-w-[68ch] text-sm leading-relaxed text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
