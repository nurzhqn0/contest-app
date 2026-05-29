import {
  ArrowRight,
  ChartBar,
  DownloadSimple,
  GlobeHemisphereWest,
  ShieldCheck,
  TelegramLogo,
} from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn({ username, password });
      navigate("/app");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell grid min-h-[100dvh] gap-6 py-6 md:py-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section
        className="surface reveal flex flex-col justify-between p-6 md:p-8"
        style={{ ["--index" as string]: 0 }}
      >
        <div className="space-y-6">
          <div className="eyebrow">Student Contest</div>
          <div className="space-y-4">
            <h1 className="headline-balance max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-ink md:text-6xl">
              Run daily student challenges without juggling spreadsheets and
              chat threads.
            </h1>
            <p className="copy-pretty max-w-[64ch] text-base leading-relaxed text-muted md:text-lg">
              The organiser dashboard controls rooms, task rules, rankings,
              exports, public access, and Telegram-driven participant flows in
              one system.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
            <article className="surface-muted flex min-h-[220px] flex-col justify-between p-5">
              <div className="space-y-3">
                <div className="eyebrow">Workflow</div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
                  Two entry paths, one room code.
                </h2>
                <p className="copy-pretty text-sm leading-relaxed text-muted">
                  Participants use Telegram to register and submit tasks. Guests
                  use the public page to follow the leaderboard when access is
                  enabled.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-white p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accentSoft text-accent">
                    <TelegramLogo size={20} weight="duotone" />
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    Participant flow
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Join by room code, submit today’s tasks, see rank.
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-white p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blueSoft text-[#1f6c9f]">
                    <GlobeHemisphereWest size={20} weight="duotone" />
                  </div>
                  <div className="text-sm font-semibold text-ink">
                    Public flow
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Open a room page by code and follow the live leaderboard.
                  </p>
                </div>
              </div>
            </article>

            <article className="surface-muted flex min-h-[220px] flex-col justify-between p-5">
              <div className="space-y-3 mb-3">
                <div className="eyebrow">Snapshot</div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
                  Built for operational clarity.
                </h2>
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-line bg-white p-4">
                  <div className="eyebrow">Rooms</div>
                  <div className="mono-data mt-2 text-3xl font-semibold tracking-[-0.04em]">
                    Live
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-white p-4">
                  <div className="eyebrow">Ranking</div>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <ChartBar size={16} weight="duotone" />
                    Automatic points after each submission
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        className="surface reveal flex flex-col justify-between p-6 md:p-8"
        style={{ ["--index" as string]: 1 }}
      >
        <div className="space-y-4">
          <div className="eyebrow">Organizer sign-in</div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="field-label">
            Username
            <input
              className="field"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="field-label">
            Password
            <input
              className="field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-redSoft px-4 py-3 text-sm text-[#9f2f2d]">
              {error}
            </div>
          ) : null}

          <button
            className="button-primary w-full"
            disabled={loading}
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
            {!loading ? <ArrowRight size={16} weight="bold" /> : null}
          </button>
        </form>

        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <Link to="/" className="button-tertiary">
              Open public room lookup
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link to="/privacy" className="button-tertiary">
              Privacy policy
            </Link>
            <Link to="/terms" className="button-tertiary">
              Terms
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
