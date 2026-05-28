import clsx from "clsx";

type Tone = "neutral" | "success" | "info" | "warning" | "danger";

const toneClassMap: Record<Tone, string> = {
  neutral: "bg-[#f3f1ec] text-ink",
  success: "bg-accentSoft text-accent",
  info: "bg-blueSoft text-[#1f6c9f]",
  warning: "bg-yellowSoft text-[#956400]",
  danger: "bg-redSoft text-[#9f2f2d]"
};

type Props = {
  label: string;
  tone?: Tone;
};

export function StatusBadge({ label, tone = "neutral" }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
        toneClassMap[tone]
      )}
    >
      {label}
    </span>
  );
}
