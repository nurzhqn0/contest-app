import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

const legalContent = {
  privacy: {
    eyebrow: "Privacy policy",
    title: "How Student Contest handles participant data",
    intro:
      "Student Contest stores organiser accounts, room settings, participant registrations, task submissions, leaderboard data, and Telegram delivery logs that are required to operate the challenge.",
    sections: [
      {
        title: "What is stored",
        body:
          "Organisers can store room names, descriptions, deadlines, task rules, participant names or aliases, Telegram identifiers, scores, exports, and penalty history."
      },
      {
        title: "Why it is stored",
        body:
          "The platform needs this data to register participants, calculate points, publish rankings according to room visibility settings, send Telegram reminders, and generate Excel exports."
      },
      {
        title: "Operational note",
        body:
          "This demo deployment is intended for local or controlled team use. Before public production use, the organiser should publish a project-specific policy covering retention, deletion, and contact details."
      }
    ]
  },
  terms: {
    eyebrow: "Terms of use",
    title: "Operational rules for organisers and participants",
    intro:
      "Student Contest is a challenge management tool. Organisers are responsible for the room rules, deadlines, participant communication, and how public rankings are configured.",
    sections: [
      {
        title: "Organiser responsibilities",
        body:
          "Organisers should configure rooms accurately, define fair scoring, control access to exported data, and review public visibility before sharing room codes."
      },
      {
        title: "Participant responsibilities",
        body:
          "Participants are expected to submit truthful daily progress, use their own Telegram account, and respect the challenge rules defined for each room."
      },
      {
        title: "Service scope",
        body:
          "The current application is an MVP. Features, exports, ranking logic, and notification timing may be refined as the deployment matures."
      }
    ]
  }
} as const;

type Props = {
  variant: keyof typeof legalContent;
};

export function LegalPage({ variant }: Props) {
  const content = legalContent[variant];

  return (
    <main className="page-shell min-h-[100dvh] py-6 md:py-8">
      <div className="mb-6">
        <Link to="/" className="button-tertiary">
          <ArrowLeft size={16} weight="bold" />
          Back to room lookup
        </Link>
      </div>

      <article className="surface mx-auto max-w-4xl space-y-8 p-6 md:p-10">
        <header className="space-y-4">
          <div className="eyebrow">{content.eyebrow}</div>
          <h1 className="headline-balance max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-ink md:text-5xl">
            {content.title}
          </h1>
          <p className="copy-pretty max-w-3xl text-base leading-relaxed text-muted">{content.intro}</p>
        </header>

        <div className="soft-divider" />

        <div className="space-y-8">
          {content.sections.map((section, index) => (
            <section key={section.title} className="reveal space-y-3" style={{ ["--index" as string]: index }}>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{section.title}</h2>
              <p className="copy-pretty max-w-3xl text-base leading-relaxed text-muted">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
