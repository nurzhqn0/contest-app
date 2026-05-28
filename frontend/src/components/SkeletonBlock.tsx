import clsx from "clsx";

type Props = {
  className?: string;
};

export function SkeletonBlock({ className }: Props) {
  return <div className={clsx("skeleton", className)} />;
}
