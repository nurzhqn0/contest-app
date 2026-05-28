import { ArrowLeft, Broadcast, CalendarDots, ChartBar, GlobeHemisphereWest, ListChecks } from "@phosphor-icons/react";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { StatusBadge } from "../components/StatusBadge";
import { api, WS_BASE } from "../lib/api";
import { formatRoomStatus, formatTaskTarget, formatTaskType } from "../lib/labels";
import { PublicRoom } from "../lib/types";

export function PublicRoomPage() {
  const { roomCode } = useParams();
  const queryClient = useQueryClient();

  const roomQuery = useQuery({
    queryKey: ["public-room", roomCode],
    queryFn: () => api.get<PublicRoom>(`/public/rooms/${roomCode}`, false),
    enabled: Boolean(roomCode)
  });

  useEffect(() => {
    if (!roomQuery.data?.id) {
      return;
    }
    const socket = new WebSocket(`${WS_BASE}/ws/rooms/${roomQuery.data.id}/leaderboard`);
    socket.onmessage = () => queryClient.invalidateQueries({ queryKey: ["public-room", roomCode] });
    return () => socket.close();
  }, [queryClient, roomCode, roomQuery.data?.id]);

  if (roomQuery.isLoading) {
    return (
      <main className="page-shell min-h-[100dvh] space-y-6 py-6 md:py-8">
        <section className="surface p-6 md:p-8">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-4 h-12 max-w-xl" />
          <SkeletonBlock className="mt-4 h-5 max-w-2xl" />
        </section>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="surface p-6 md:p-8">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-5 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
          </section>
          <section className="surface p-6 md:p-8">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-5 h-24 w-full" />
            <SkeletonBlock className="mt-3 h-24 w-full" />
          </section>
        </div>
      </main>
    );
  }

  if (roomQuery.error || !roomQuery.data) {
    return (
      <main className="page-shell flex min-h-[100dvh] items-center py-6">
        <section className="surface mx-auto max-w-3xl p-6 md:p-8">
          <EmptyState
            icon={GlobeHemisphereWest}
            title="This room is not available."
            description={roomQuery.error instanceof Error ? roomQuery.error.message : "The requested room could not be opened."}
            action={
              <Link to="/" className="button-primary">
                <ArrowLeft size={16} weight="bold" />
                Back to room lookup
              </Link>
            }
          />
        </section>
      </main>
    );
  }

  const room = roomQuery.data;

  return (
    <main className="page-shell min-h-[100dvh] space-y-6 py-6 md:py-8">
      <div>
        <Link to="/" className="button-tertiary">
          <ArrowLeft size={16} weight="bold" />
          Back to room lookup
        </Link>
      </div>

      <section className="surface reveal p-6 md:p-8" style={{ ["--index" as string]: 0 }}>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="eyebrow">Public leaderboard</div>
              <StatusBadge label={formatRoomStatus(room.status)} tone={room.status === "active" ? "success" : room.status === "upcoming" ? "warning" : "neutral"} />
              <StatusBadge label={`Code ${room.room_code}`} tone="info" />
            </div>
            <h1 className="headline-balance max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-ink md:text-5xl">
              {room.name}
            </h1>
            <p className="copy-pretty max-w-[68ch] text-base leading-relaxed text-muted">
              {room.description || "The organiser has not added a room description yet."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <article className="surface-muted p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                <Broadcast size={20} weight="duotone" />
              </div>
              <div className="eyebrow">Leaderboard entries</div>
              <div className="mono-data mt-2 text-3xl font-semibold tracking-[-0.04em]">{room.leaderboard.length}</div>
            </article>
            <article className="surface-muted p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                <ListChecks size={20} weight="duotone" />
              </div>
              <div className="eyebrow">Active tasks</div>
              <div className="mono-data mt-2 text-3xl font-semibold tracking-[-0.04em]">{room.tasks.length}</div>
            </article>
            <article className="surface-muted p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                <ChartBar size={20} weight="duotone" />
              </div>
              <div className="eyebrow">Live updates</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">Leaderboard refreshes automatically while this page stays open.</p>
            </article>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Leaderboard"
          eyebrow="Ranking"
          description="Names and scores follow the organiser's visibility settings for this room."
        >
          {room.leaderboard.length ? (
            <div className="overflow-x-auto">
              <table className="grid-table min-w-full">
                <thead>
                  <tr>
                    <th>Place</th>
                    <th>Participant</th>
                    <th>Total score</th>
                    <th>Today</th>
                    <th>Completed days</th>
                  </tr>
                </thead>
                <tbody>
                  {room.leaderboard.map((entry) => (
                    <tr key={entry.student_id}>
                      <td className="mono-data">#{entry.position}</td>
                      <td>{entry.display_name}</td>
                      <td>{entry.score_visible ? `${entry.total_points} pts` : "Hidden"}</td>
                      <td>{entry.score_visible ? `${entry.today_points} pts` : "Hidden"}</td>
                      <td>{entry.completed_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={ChartBar}
              title="No ranking data yet"
              description="The leaderboard will appear here after participants register and submit daily task results."
              compact
            />
          )}
        </SectionCard>

        <SectionCard
          title="Active tasks"
          eyebrow="Daily checklist"
          description="These are the tasks currently visible to Telegram participants in this room."
        >
          {room.tasks.length ? (
            <div className="space-y-3">
              {room.tasks.map((task, index) => (
                <article key={task.id} className="reveal rounded-lg border border-line bg-[#f7f6f2]/7 p-4" style={{ ["--index" as string]: index }}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-ink">{task.name}</div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={formatTaskType(task.type)} tone="info" />
                        <StatusBadge label={`Target ${formatTaskTarget(task)}`} />
                      </div>
                    </div>
                    <div className="space-y-2 text-left md:text-right">
                      <div className="mono-data text-lg font-semibold text-ink">{task.points} pts</div>
                      <div className="flex items-center gap-2 text-sm text-muted md:justify-end">
                        <CalendarDots size={16} weight="duotone" />
                        Bonus {task.bonus_per_unit || 0} per extra unit
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ListChecks}
              title="No active tasks"
              description="The organiser has not published task rules for this room yet."
              compact
            />
          )}
        </SectionCard>
      </div>
    </main>
  );
}
