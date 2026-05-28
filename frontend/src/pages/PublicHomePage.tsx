import {
  ArrowRight,
  GlobeHemisphereWest,
  Key,
  Medal,
  ShieldCheck,
  TelegramLogo,
} from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const publicSteps = [
  {
    title: "Participants register in Telegram",
    description:
      "They start the @oina_buddybot, enter the room code, add a name, and receive today’s task prompts.",
    icon: TelegramLogo,
  },
  {
    title: "Guests open the public room page",
    description:
      "The same room code opens the public leaderboard when the organiser allows public access.",
    icon: GlobeHemisphereWest,
  },
  // {
  //   title: "Visibility rules stay in control",
  //   description: "Names, aliases, anonymous mode, and score visibility follow organiser settings automatically.",
  //   icon: ShieldCheck
  // }
];

export function PublicHomePage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!roomCode.trim()) {
      return;
    }
    navigate(`/room/${roomCode.trim().toUpperCase()}`);
  }

  return (
    <main className="page-shell grid min-h-[100dvh] gap-6 py-6 md:py-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section
        className="surface reveal flex flex-col justify-between p-6 md:p-8"
        style={{ ["--index" as string]: 0 }}
      >
        <div className="space-y-6">
          <div className="eyebrow">Public room access</div>
          <div className="space-y-4">
            <h1 className="headline-balance max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-ink md:text-6xl">
              Open a room by code and view the challenge as a participant or
              guest.
            </h1>
            <p className="copy-pretty max-w-[64ch] text-base leading-relaxed text-muted md:text-lg">
              Student Contest supports two user paths: Telegram participants
              submit daily progress, while public viewers can follow the
              leaderboard from the web when access is enabled.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {publicSteps.map((item, index) => (
              <article
                key={item.title}
                className="reveal rounded-lg border border-line bg-[#f7f6f2]/85 p-4"
                style={{ ["--index" as string]: index + 1 }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                  <item.icon size={20} weight="duotone" />
                </div>
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-ink">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          <article className="surface-muted flex flex-col justify-between p-5">
            <div className="space-y-3">
              <div className="eyebrow">Example</div>
              <div className="rounded-lg border border-line bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
                  <Key size={16} weight="duotone" />
                  Room code
                </div>
                <div className="mono-data text-2xl font-semibold tracking-[0.14em] text-ink">
                  RAM25
                </div>
              </div>
              <div className="rounded-lg border border-line bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
                  <Medal size={16} weight="duotone" />
                  Public URL
                </div>
                <div className="mono-data break-all text-sm text-muted">
                  yourapp.com/room/RAM25
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
              <Link to="/login" className="button-tertiary">
                Organizer sign-in
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link to="/privacy" className="button-tertiary">
                Privacy policy
              </Link>
              <Link to="/terms" className="button-tertiary">
                Terms
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section
        className="surface reveal flex flex-col justify-between p-6 md:p-8"
        style={{ ["--index" as string]: 1 }}
      >
        <div className="space-y-4">
          <div className="eyebrow">Find a room</div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-ink md:text-4xl">
            Enter the room code
          </h2>
          <p className="copy-pretty max-w-[56ch] text-sm leading-relaxed text-muted">
            If the code is valid and public access is enabled, you will open the
            room page with the latest leaderboard and active tasks.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="field-label">
            Room code
            <input
              className="field mono-data text-center text-2xl uppercase tracking-[0.28em]"
              maxLength={12}
              placeholder="RAM25"
              value={roomCode}
              onChange={(event) =>
                setRoomCode(event.target.value.toUpperCase())
              }
            />
          </label>

          <button className="button-primary w-full" type="submit">
            Open room
            <ArrowRight size={16} weight="bold" />
          </button>
        </form>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="surface-muted p-4">
            <div className="eyebrow">For participants</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Use Telegram to register, submit daily tasks, and view your rank.
            </p>
          </div>
          <div className="surface-muted p-4">
            <div className="eyebrow">For guests</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Use the code on this page to watch the public leaderboard in real
              time.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
