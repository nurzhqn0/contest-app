import { IconProps } from "@phosphor-icons/react";
import clsx from "clsx";

type Props = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "default" | "accent" | "muted";
  icon?: React.ComponentType<IconProps>;
};

export function StatCard({ label, value, detail, tone = "default", icon: Icon }: Props) {
  return (
    <article
      className={clsx(
        "reveal flex min-h-[160px] flex-col justify-between rounded-xl border p-5",
        tone === "accent" && "border-accent bg-accent text-white",
        tone === "default" && "border-line bg-surface",
        tone === "muted" && "border-line bg-[#f7f6f2]/85"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={clsx("eyebrow", tone === "accent" && "text-white/72")}>{label}</div>
        {Icon ? (
          <div
            className={clsx(
              "flex h-10 w-10 items-center justify-center rounded-lg border",
              tone === "accent" ? "border-white/20 bg-white/10" : "border-line bg-[#f7f6f2]"
            )}
          >
            <Icon size={18} weight="duotone" />
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className={clsx("mono-data text-[2.35rem] font-semibold tracking-[-0.04em]", tone === "accent" ? "text-white" : "text-ink")}>
          {value}
        </div>
        {detail ? (
          <p className={clsx("copy-pretty text-sm leading-relaxed", tone === "accent" ? "text-white/72" : "text-muted")}>
            {detail}
          </p>
        ) : null}
      </div>
    </article>
  );
}
