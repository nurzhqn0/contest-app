import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

const legalContent = {
  privacy: {
    eyebrow: "Privacy policy",
    title: "How Student Contest handles participant data",
    intro:
      "Student Contest stores only the data needed to run challenge rooms, register participants through Telegram, calculate scores, show leaderboards, send reminders, and generate Excel exports for organisers.",
    sections: [
      {
        title: "What data is collected",
        body: "The platform may store organiser account details, room names, room codes, room settings, task rules, participant names or aliases, Telegram identifiers, Telegram usernames, daily task submissions, points, leaderboard positions, penalties, notification logs, and Excel export records.",
      },
      {
        title: "Telegram registration",
        body: "Participants register through the Telegram bot by entering a room code and their name. Their Telegram account is linked to the selected room so they can submit daily progress, receive reminders, and view their current result.",
      },
      {
        title: "Why the data is used",
        body: "This data is used to manage rooms, register participants, calculate daily and total points, update leaderboards, apply visibility settings, send Telegram notifications, track penalties, and prepare Excel reports for organisers.",
      },
      {
        title: "Leaderboard visibility",
        body: "Organisers control how participant names and scores are displayed. Depending on room settings, the leaderboard may show real names, aliases, anonymous labels, full scores, only ranks, or hidden scores.",
      },
      {
        title: "Excel exports",
        body: "Organisers may export room data, participants, tasks, daily results, leaderboard standings, and penalties into Excel files. Organisers are responsible for storing and sharing exported files safely.",
      },
      {
        title: "Data control",
        body: "Organisers can edit rooms, participants, tasks, submissions, penalties, and visibility settings. Before public production use, the organiser should define clear rules for data retention, deletion requests, and support contact details.",
      },
      {
        title: "Operational note",
        body: "This application is intended as an MVP for local, private, or controlled team use. It should not be treated as a complete legal privacy policy for public production deployment without additional legal review.",
      },
    ],
  },

  terms: {
    eyebrow: "Terms of use",
    title: "Rules for organisers and participants",
    intro:
      "Student Contest is a room-based challenge management system with Telegram registration, daily task submissions, automatic scoring, leaderboards, reminders, penalties, and Excel exports.",
    sections: [
      {
        title: "Organiser responsibilities",
        body: "Organisers are responsible for creating rooms, setting fair task rules, defining points, managing participants, configuring deadlines, reviewing submissions, controlling leaderboard visibility, and protecting exported Excel files.",
      },
      {
        title: "Participant responsibilities",
        body: "Participants are expected to register using their own Telegram account, enter the correct room code, provide an appropriate name, submit truthful daily progress, and follow the rules set by the organiser.",
      },
      {
        title: "Room codes",
        body: "Room codes are used to register through the Telegram bot and to access public room pages when public access is enabled. Organisers should share room codes only with the intended audience.",
      },
      {
        title: "Scoring and rankings",
        body: "Scores and rankings are calculated based on the task rules configured by the organiser. Results may change if submissions are edited, penalties are applied, or scoring rules are updated.",
      },
      {
        title: "Telegram notifications",
        body: "The bot may send reminders, daily result summaries, and ranking updates. Notification timing depends on the room settings and may not be guaranteed to arrive exactly at the configured time.",
      },
      {
        title: "Exports and reports",
        body: "Excel exports are provided for organiser convenience. Organisers are responsible for checking exported data and controlling who can access the exported files.",
      },
      {
        title: "Service scope",
        body: "The current application is an MVP. Features such as scoring logic, exports, WebSocket updates, Telegram reminders, visibility settings, and dashboard analytics may be changed or improved over time.",
      },
    ],
  },
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
          <p className="copy-pretty max-w-3xl text-base leading-relaxed text-muted">
            {content.intro}
          </p>
        </header>

        <div className="soft-divider" />

        <div className="space-y-8">
          {content.sections.map((section, index) => (
            <section
              key={section.title}
              className="reveal space-y-3"
              style={{ ["--index" as string]: index }}
            >
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
                {section.title}
              </h2>
              <p className="copy-pretty max-w-3xl text-base leading-relaxed text-muted">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
