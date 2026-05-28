import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="page-shell flex min-h-[100dvh] items-center py-6">
      <section className="surface mx-auto max-w-3xl p-6 md:p-10">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-yellowSoft text-[#956400]">
          <WarningCircle size={28} weight="duotone" />
        </div>
        <div className="space-y-4">
          <div className="eyebrow">404</div>
          <h1 className="headline-balance max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-ink md:text-5xl">
            This page does not exist.
          </h1>
          <p className="copy-pretty max-w-[60ch] text-base leading-relaxed text-muted">
            The address may be outdated, the room code may be incorrect, or the page was removed from this build.
          </p>
        </div>
        <div className="mt-8">
          <Link to="/" className="button-primary">
            <ArrowLeft size={16} weight="bold" />
            Return to room lookup
          </Link>
        </div>
      </section>
    </main>
  );
}
