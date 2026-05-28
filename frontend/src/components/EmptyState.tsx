import { IconProps } from "@phosphor-icons/react";
import clsx from "clsx";
import { ReactNode } from "react";

type Props = {
  icon: React.ComponentType<IconProps>;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
};

export function EmptyState({ icon: Icon, title, description, action, compact = false }: Props) {
  return (
    <div
      className={clsx(
        "surface-muted flex flex-col items-start gap-4 border-dashed",
        compact ? "p-5" : "p-6 md:p-8"
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-accent">
        <Icon size={22} weight="duotone" />
      </div>
      <div className="space-y-2">
        <h3 className="headline-balance text-lg font-semibold text-ink">{title}</h3>
        <p className="copy-pretty max-w-[60ch] text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
