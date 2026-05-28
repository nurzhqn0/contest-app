import {
  ArrowRight,
  ChartBar,
  ClockCountdown,
  DownloadSimple,
  GlobeHemisphereWest,
  Medal,
  Plus,
  Rows,
  TelegramLogo,
  UsersThree
} from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { formatRoomStatus, scoreText } from "../lib/labels";
import { DashboardData, Room } from "../lib/types";

const defaultRoom = {
  name: "",
  description: "",
  status: "active",
  room_code: "",
  registration_enabled: true,
  public_access_enabled: true,
  leaderboard_visibility: "public",
  name_visibility: "real_names",
  score_visibility: "all_scores",
  notifications_enabled: false,
  first_reminder_time: "20:00",
  second_reminder_time: "22:00",
  daily_deadline: "23:59",
  send_daily_summary: false,
  all_required_bonus_points: 0
};

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [roomForm, setRoomForm] = useState(defaultRoom);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/dashboard/overview")
  });

  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api.get<Room[]>("/rooms")
  });

  const createRoomMutation = useMutation({
    mutationFn: () => api.post<Room>("/rooms", { ...roomForm, room_code: roomForm.room_code || null }),
    onSuccess: () => {
      setRoomForm(defaultRoom);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const dashboard = dashboardQuery.data;
  const rooms = roomsQuery.data ?? [];

  function handleCreateRoom(event: FormEvent) {
    event.preventDefault();
    createRoomMutation.mutate();
  }

  const loading = dashboardQuery.isLoading || roomsQuery.isLoading;

  return (
    <div className="space-y-6 pb-12">
      <section className="surface reveal p-6 md:p-8" style={{ ["--index" as string]: 0 }}>
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <div className="eyebrow">Organizer dashboard</div>
            <h1 className="headline-balance max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-ink md:text-5xl">
              Build rooms, manage participants, and keep each challenge operational day by day.
            </h1>
            <p className="copy-pretty max-w-[66ch] text-base leading-relaxed text-muted">
              The dashboard focuses on room creation, live student activity, leaderboard control, Telegram reminders,
              and export-ready records.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#new-room" className="button-primary">
                <Plus size={16} weight="bold" />
                Create room
              </a>
              <Link to="/" className="button-secondary">
                <GlobeHemisphereWest size={16} weight="bold" />
                Open public lookup
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="surface-muted p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                <TelegramLogo size={20} weight="duotone" />
              </div>
              <div className="eyebrow">Participant flow</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Telegram remains the daily interaction channel for registration, reminders, submissions, and results.
              </p>
            </article>
            <article className="surface-muted p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                <DownloadSimple size={20} weight="duotone" />
              </div>
              <div className="eyebrow">Room exports</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Each room can be exported to Excel with settings, students, daily progress, leaderboard, and penalties.
              </p>
            </article>
            <article className="surface-muted p-4 sm:col-span-2">
              <div className="eyebrow">Daily control</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge label="Rooms" tone="info" />
                <StatusBadge label="Leaderboard" tone="success" />
                <StatusBadge label="Notifications" tone="warning" />
                <StatusBadge label="Public access" tone="neutral" />
              </div>
            </article>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="surface p-5">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="mt-6 h-12 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Rooms" value={dashboard?.total_rooms ?? 0} detail="All rooms in the system." icon={Rows} tone="accent" />
          <StatCard label="Active" value={dashboard?.active_rooms ?? 0} detail="Rooms currently open to the challenge." icon={ChartBar} />
          <StatCard label="Students" value={dashboard?.total_students ?? 0} detail="Registered participants across rooms." icon={UsersThree} />
          <StatCard label="Submitted today" value={dashboard?.submitted_today ?? 0} detail="Participants who sent today’s answers." icon={Medal} />
          <StatCard label="Missed today" value={dashboard?.missed_today ?? 0} detail="Participants still pending before deadline." icon={ClockCountdown} tone="muted" />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <SectionCard
          title="Rooms"
          eyebrow="Workspace"
          description="Each room combines settings, tasks, students, daily progress, leaderboard rules, penalties, and exports."
        >
          {rooms.length ? (
            <div className="space-y-4">
              {rooms.map((room, index) => (
                <article key={room.id} className="reveal rounded-lg border border-line bg-[#f7f6f2]/72 p-5" style={{ ["--index" as string]: index }}>
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          label={formatRoomStatus(room.status)}
                          tone={room.status === "active" ? "success" : room.status === "upcoming" ? "warning" : "neutral"}
                        />
                        <StatusBadge label={`Code ${room.room_code}`} tone="info" />
                        {room.public_access_enabled ? <StatusBadge label="Public page" /> : null}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{room.name}</h3>
                        <p className="copy-pretty max-w-[64ch] text-sm leading-relaxed text-muted">
                          {room.description || "No description yet. Add context so participants understand the room purpose."}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-line bg-white p-4">
                          <div className="eyebrow">Students</div>
                          <div className="mono-data mt-2 text-2xl font-semibold tracking-[-0.04em]">{room.students_count}</div>
                        </div>
                        <div className="rounded-lg border border-line bg-white p-4">
                          <div className="eyebrow">Tasks</div>
                          <div className="mono-data mt-2 text-2xl font-semibold tracking-[-0.04em]">{room.tasks_count}</div>
                        </div>
                        <div className="rounded-lg border border-line bg-white p-4">
                          <div className="eyebrow">Deadline</div>
                          <div className="mono-data mt-2 text-2xl font-semibold tracking-[-0.04em]">{room.daily_deadline}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:w-[220px] xl:justify-end">
                      <Link className="button-primary" to={`/app/rooms/${room.id}`}>
                        Open room
                        <ArrowRight size={16} weight="bold" />
                      </Link>
                      <button className="button-secondary" onClick={() => api.download(`/rooms/${room.id}/export`)}>
                        <DownloadSimple size={16} weight="bold" />
                        Excel
                      </button>
                      <button
                        className="button-secondary !border-red-200 !text-[#9f2f2d]"
                        onClick={() => {
                          if (window.confirm(`Delete room "${room.name}"?`)) {
                            deleteRoomMutation.mutate(room.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Rows}
              title="No rooms yet"
              description="Create the first room to configure tasks, invite students by room code, and start collecting daily progress."
              action={
                <a href="#new-room" className="button-primary">
                  <Plus size={16} weight="bold" />
                  Create the first room
                </a>
              }
            />
          )}
        </SectionCard>

        <SectionCard
          title="New room"
          eyebrow="Quick create"
          description="Start with the operational essentials. Fine-tune visibility, notifications, tasks, and penalties after the room is created."
          className="h-fit"
        >
          <form id="new-room" className="space-y-5" onSubmit={handleCreateRoom}>
            <div className="grid gap-4">
              <label className="field-label">
                Room name
                <input
                  className="field"
                  placeholder="30-day discipline sprint"
                  value={roomForm.name}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>

              <label className="field-label">
                Description
                <textarea
                  className="field min-h-28 resize-y"
                  placeholder="What is this room for, who is joining, and how should scores be interpreted?"
                  value={roomForm.description}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-label">
                Room code
                <input
                  className="field mono-data uppercase"
                  placeholder="Optional"
                  value={roomForm.room_code}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, room_code: event.target.value.toUpperCase() }))}
                />
              </label>

              <label className="field-label">
                Status
                <select
                  className="field"
                  value={roomForm.status}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-label">
                Daily deadline
                <input
                  className="field mono-data"
                  placeholder="23:59"
                  value={roomForm.daily_deadline}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, daily_deadline: event.target.value }))}
                />
              </label>

              <label className="field-label">
                All-required bonus points
                <input
                  className="field mono-data"
                  placeholder="0"
                  inputMode="decimal"
                  step="any"
                  type="number"
                  value={roomForm.all_required_bonus_points}
                  onChange={(event) =>
                    setRoomForm((prev) => ({ ...prev, all_required_bonus_points: Number(event.target.value) }))
                  }
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-label">
                First reminder
                <input
                  className="field mono-data"
                  placeholder="20:00"
                  value={roomForm.first_reminder_time ?? ""}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, first_reminder_time: event.target.value }))}
                />
              </label>

              <label className="field-label">
                Second reminder
                <input
                  className="field mono-data"
                  placeholder="22:00"
                  value={roomForm.second_reminder_time ?? ""}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, second_reminder_time: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-3">
              <label className="toggle-row">
                <input
                  checked={roomForm.registration_enabled}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, registration_enabled: event.target.checked }))}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-ink">Telegram registration</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">
                    Allow new participants to join the room with the room code.
                  </span>
                </span>
              </label>

              <label className="toggle-row">
                <input
                  checked={roomForm.public_access_enabled}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, public_access_enabled: event.target.checked }))}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-ink">Public room page</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">
                    Allow guests to open the room leaderboard by room code on the web.
                  </span>
                </span>
              </label>

              <label className="toggle-row">
                <input
                  checked={roomForm.notifications_enabled}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, notifications_enabled: event.target.checked }))}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-ink">Telegram reminders</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">
                    Schedule daily reminder notifications for students who have not submitted yet.
                  </span>
                </span>
              </label>

              <label className="toggle-row">
                <input
                  checked={roomForm.send_daily_summary}
                  onChange={(event) => setRoomForm((prev) => ({ ...prev, send_daily_summary: event.target.checked }))}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-ink">Daily summary message</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">
                    Send end-of-day totals and current rank to each participant.
                  </span>
                </span>
              </label>
            </div>

            {createRoomMutation.error instanceof Error ? (
              <div className="rounded-lg border border-red-200 bg-redSoft px-4 py-3 text-sm text-[#9f2f2d]">
                {createRoomMutation.error.message}
              </div>
            ) : null}

            <button className="button-primary w-full" disabled={createRoomMutation.isPending || !roomForm.name.trim()} type="submit">
              {createRoomMutation.isPending ? "Creating room..." : "Create room"}
            </button>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        title="Top students"
        eyebrow="Live snapshot"
        description="This view reflects the current leaderboard state across active rooms."
      >
        {dashboard?.top_students?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboard.top_students.map((entry, index) => (
              <article key={`${entry.student_id}-${entry.position}`} className="reveal rounded-lg border border-line bg-[#f7f6f2]/72 p-5" style={{ ["--index" as string]: index }}>
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge label={`#${entry.position}`} tone="info" />
                  <Medal size={18} weight="duotone" className="text-accent" />
                </div>
                <div className="mt-5 space-y-2">
                  <div className="headline-balance text-lg font-semibold text-ink">{entry.display_name}</div>
                  <div className="text-sm text-muted">{scoreText(entry)}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Medal}
            title="No leaderboard activity yet"
            description="Top students will appear after rooms collect registrations and participants start sending daily answers."
            compact
          />
        )}
      </SectionCard>
    </div>
  );
}
