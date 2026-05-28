import {
  ArrowLeft,
  Broadcast,
  ChartBar,
  ClockCountdown,
  DownloadSimple,
  GlobeHemisphereWest,
  ListChecks,
  Medal,
  ShieldWarning,
  Student as StudentIcon,
  TelegramLogo,
  Timer,
  UsersThree
} from "@phosphor-icons/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { api, WS_BASE } from "../lib/api";
import {
  formatDate,
  formatDateTime,
  formatLeaderboardVisibility,
  formatNameVisibility,
  formatProgressAnswers,
  formatPunishmentStatus,
  formatRoomStatus,
  formatScoreVisibility,
  formatStudentSource,
  formatStudentStatus,
  formatTaskTarget,
  formatTaskType
} from "../lib/labels";
import { LeaderboardRow, ProgressRow, Punishment, Room, Student, Task } from "../lib/types";

type TaskFormState = {
  id: number | null;
  name: string;
  type: Task["type"];
  target: number;
  target_max: number;
  points: number;
  bonus_per_unit: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
};

type StudentFormState = {
  id: number | null;
  name: string;
  alias: string;
  telegram_id: string;
  telegram_username: string;
  is_registered_in_telegram: boolean;
  status: Student["status"];
};

type PunishmentFormState = {
  id: number | null;
  student_id: number;
  type: string;
  reason: string;
  status: Punishment["status"];
};

const emptyTaskForm = (): TaskFormState => ({
  id: null,
  name: "",
  type: "quantity",
  target: 0,
  target_max: 0,
  points: 10,
  bonus_per_unit: 0,
  is_required: false,
  is_active: true,
  sort_order: 0
});

const emptyStudentForm = (): StudentFormState => ({
  id: null,
  name: "",
  alias: "",
  telegram_id: "",
  telegram_username: "",
  is_registered_in_telegram: false,
  status: "active"
});

const emptyPunishmentForm = (): PunishmentFormState => ({
  id: null,
  student_id: 0,
  type: "",
  reason: "",
  status: "pending"
});

function leaderboardTone(row: LeaderboardRow) {
  if (row.position === 1) {
    return "success";
  }
  if (row.position <= 3) {
    return "info";
  }
  return "neutral";
}

export function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const numericRoomId = Number(roomId);
  const [progressDate, setProgressDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomForm, setRoomForm] = useState<Room | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [studentForm, setStudentForm] = useState<StudentFormState>(emptyStudentForm);
  const [punishmentForm, setPunishmentForm] = useState<PunishmentFormState>(emptyPunishmentForm);

  const roomQuery = useQuery({
    queryKey: ["room", numericRoomId],
    queryFn: () => api.get<Room>(`/rooms/${numericRoomId}`),
    enabled: Number.isFinite(numericRoomId)
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", numericRoomId],
    queryFn: () => api.get<Task[]>(`/rooms/${numericRoomId}/tasks`),
    enabled: Number.isFinite(numericRoomId)
  });

  const studentsQuery = useQuery({
    queryKey: ["students", numericRoomId],
    queryFn: () => api.get<Student[]>(`/rooms/${numericRoomId}/students`),
    enabled: Number.isFinite(numericRoomId)
  });

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", numericRoomId],
    queryFn: () => api.get<LeaderboardRow[]>(`/rooms/${numericRoomId}/leaderboard`),
    enabled: Number.isFinite(numericRoomId)
  });

  const progressQuery = useQuery({
    queryKey: ["progress", numericRoomId, progressDate],
    queryFn: () => api.get<ProgressRow[]>(`/rooms/${numericRoomId}/progress?progress_date=${progressDate}`),
    enabled: Number.isFinite(numericRoomId)
  });

  const punishmentsQuery = useQuery({
    queryKey: ["punishments", numericRoomId],
    queryFn: () => api.get<Punishment[]>(`/rooms/${numericRoomId}/punishments`),
    enabled: Number.isFinite(numericRoomId)
  });

  useEffect(() => {
    if (roomQuery.data) {
      setRoomForm(roomQuery.data);
    }
  }, [roomQuery.data]);

  useEffect(() => {
    if (!numericRoomId) {
      return;
    }
    const socket = new WebSocket(`${WS_BASE}/ws/rooms/${numericRoomId}/leaderboard`);
    socket.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard", numericRoomId] });
      queryClient.invalidateQueries({ queryKey: ["progress", numericRoomId] });
      queryClient.invalidateQueries({ queryKey: ["students", numericRoomId] });
      queryClient.invalidateQueries({ queryKey: ["punishments", numericRoomId] });
    };
    return () => socket.close();
  }, [numericRoomId, queryClient]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["room", numericRoomId] });
    queryClient.invalidateQueries({ queryKey: ["tasks", numericRoomId] });
    queryClient.invalidateQueries({ queryKey: ["students", numericRoomId] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard", numericRoomId] });
    queryClient.invalidateQueries({ queryKey: ["progress", numericRoomId] });
    queryClient.invalidateQueries({ queryKey: ["punishments", numericRoomId] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveRoomMutation = useMutation({
    mutationFn: () => api.put<Room>(`/rooms/${numericRoomId}`, roomForm),
    onSuccess: refreshAll
  });

  const deleteRoomMutation = useMutation({
    mutationFn: () => api.delete(`/rooms/${numericRoomId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/app");
    }
  });

  const saveTaskMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: taskForm.name,
        type: taskForm.type,
        target: taskForm.target,
        target_max: taskForm.target_max,
        points: taskForm.points,
        bonus_per_unit: taskForm.bonus_per_unit,
        is_required: taskForm.is_required,
        is_active: taskForm.is_active,
        sort_order: taskForm.sort_order
      };

      if (taskForm.id) {
        return api.put<Task>(`/rooms/${numericRoomId}/tasks/${taskForm.id}`, payload);
      }
      return api.post<Task>(`/rooms/${numericRoomId}/tasks`, payload);
    },
    onSuccess: () => {
      setTaskForm(emptyTaskForm());
      refreshAll();
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => api.delete(`/rooms/${numericRoomId}/tasks/${taskId}`),
    onSuccess: refreshAll
  });

  const saveStudentMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: studentForm.name,
        alias: studentForm.alias || null,
        telegram_id: studentForm.telegram_id || null,
        telegram_username: studentForm.telegram_username || null,
        is_registered_in_telegram: studentForm.is_registered_in_telegram,
        status: studentForm.status
      };

      if (studentForm.id) {
        return api.put<Student>(`/rooms/${numericRoomId}/students/${studentForm.id}`, payload);
      }
      return api.post<Student>(`/rooms/${numericRoomId}/students`, payload);
    },
    onSuccess: () => {
      setStudentForm(emptyStudentForm());
      refreshAll();
    }
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: number) => api.delete(`/rooms/${numericRoomId}/students/${studentId}`),
    onSuccess: refreshAll
  });

  const savePunishmentMutation = useMutation({
    mutationFn: () => {
      const payload = {
        student_id: punishmentForm.student_id,
        type: punishmentForm.type,
        reason: punishmentForm.reason,
        status: punishmentForm.status
      };

      if (punishmentForm.id) {
        return api.put<Punishment>(`/rooms/${numericRoomId}/punishments/${punishmentForm.id}`, payload);
      }
      return api.post<Punishment>(`/rooms/${numericRoomId}/punishments`, payload);
    },
    onSuccess: () => {
      setPunishmentForm(emptyPunishmentForm());
      refreshAll();
    }
  });

  const deletePunishmentMutation = useMutation({
    mutationFn: (punishmentId: number) => api.delete(`/rooms/${numericRoomId}/punishments/${punishmentId}`),
    onSuccess: refreshAll
  });

  const tasks = tasksQuery.data ?? [];
  const students = studentsQuery.data ?? [];
  const leaderboard = leaderboardQuery.data ?? [];
  const progress = progressQuery.data ?? [];
  const punishments = punishmentsQuery.data ?? [];
  const studentNameMap = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student.name])), [students]);
  const activeTasks = tasks.filter((task) => task.is_active).length;
  const pendingPunishments = punishments.filter((punishment) => punishment.status === "pending").length;

  function handleSaveRoom() {
    saveRoomMutation.mutate();
  }

  function handleDeleteRoom() {
    if (!window.confirm("Delete this room and all related tasks, students, and progress?")) {
      return;
    }
    deleteRoomMutation.mutate();
  }

  function handleTaskSubmit(event: FormEvent) {
    event.preventDefault();
    saveTaskMutation.mutate();
  }

  function handleStudentSubmit(event: FormEvent) {
    event.preventDefault();
    saveStudentMutation.mutate();
  }

  function handlePunishmentSubmit(event: FormEvent) {
    event.preventDefault();
    savePunishmentMutation.mutate();
  }

  if (roomQuery.isLoading || !roomForm) {
    return (
      <div className="space-y-6 pb-12">
        <section className="surface p-6 md:p-8">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-4 h-12 max-w-xl" />
          <SkeletonBlock className="mt-4 h-5 max-w-2xl" />
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="surface p-5">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="mt-6 h-12 w-24" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="surface p-6 md:p-8">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-5 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonBlock className="mt-3 h-28 w-full" />
          </section>
          <section className="surface p-6 md:p-8">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-5 h-14 w-full" />
            <SkeletonBlock className="mt-3 h-14 w-full" />
            <SkeletonBlock className="mt-3 h-14 w-full" />
          </section>
        </div>
      </div>
    );
  }

  if (roomQuery.error) {
    return (
      <section className="surface p-6 md:p-8">
        <EmptyState
          icon={Broadcast}
          title="This room could not be loaded"
          description={roomQuery.error instanceof Error ? roomQuery.error.message : "Try again from the dashboard."}
          action={
            <Link to="/app" className="button-primary">
              <ArrowLeft size={16} weight="bold" />
              Back to dashboard
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link to="/app" className="button-tertiary">
          <ArrowLeft size={16} weight="bold" />
          Back to dashboard
        </Link>
      </div>

      <section className="surface reveal p-6 md:p-8" style={{ ["--index" as string]: 0 }}>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="eyebrow">Room workspace</div>
              <StatusBadge
                label={formatRoomStatus(roomForm.status)}
                tone={roomForm.status === "active" ? "success" : roomForm.status === "upcoming" ? "warning" : "neutral"}
              />
              <StatusBadge label={`Code ${roomForm.room_code}`} tone="info" />
            </div>
            <h1 className="headline-balance max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-ink md:text-5xl">
              {roomForm.name}
            </h1>
            <p className="copy-pretty max-w-[68ch] text-base leading-relaxed text-muted">
              {roomForm.description || "Add a room description to explain the challenge rules and the expected participant behaviour."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="button-primary" onClick={() => api.download(`/rooms/${numericRoomId}/export`)}>
                <DownloadSimple size={16} weight="bold" />
                Download Excel
              </button>
              <button className="button-secondary" onClick={handleDeleteRoom}>
                Delete room
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Students" value={students.length} detail="Registered participants in this room." icon={UsersThree} />
            <StatCard label="Active tasks" value={activeTasks} detail="Tasks currently shown to participants." icon={ListChecks} />
            <StatCard label="Pending penalties" value={pendingPunishments} detail="Outstanding penalties still under review." icon={ShieldWarning} tone="muted" />
            <StatCard label="Deadline" value={roomForm.daily_deadline} detail="Editing stays open until this daily cutoff." icon={Timer} tone="accent" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Room settings"
          eyebrow="Configuration"
          description="These settings control registration, visibility, reminders, and the public room behaviour."
        >
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-label">
                Room name
                <input className="field" value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} />
              </label>

              <label className="field-label">
                Room code
                <input
                  className="field mono-data uppercase"
                  value={roomForm.room_code}
                  onChange={(event) => setRoomForm({ ...roomForm, room_code: event.target.value.toUpperCase() })}
                />
              </label>
            </div>

            <label className="field-label">
              Description
              <textarea
                className="field min-h-28 resize-y"
                value={roomForm.description}
                onChange={(event) => setRoomForm({ ...roomForm, description: event.target.value })}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="field-label">
                Status
                <select className="field" value={roomForm.status} onChange={(event) => setRoomForm({ ...roomForm, status: event.target.value as Room["status"] })}>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="field-label">
                Daily deadline
                <input
                  className="field mono-data"
                  value={roomForm.daily_deadline}
                  onChange={(event) => setRoomForm({ ...roomForm, daily_deadline: event.target.value })}
                />
              </label>

              <label className="field-label">
                First reminder
                <input
                  className="field mono-data"
                  placeholder="20:00"
                  value={roomForm.first_reminder_time ?? ""}
                  onChange={(event) => setRoomForm({ ...roomForm, first_reminder_time: event.target.value || null })}
                />
              </label>

              <label className="field-label">
                Second reminder
                <input
                  className="field mono-data"
                  placeholder="22:00"
                  value={roomForm.second_reminder_time ?? ""}
                  onChange={(event) => setRoomForm({ ...roomForm, second_reminder_time: event.target.value || null })}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-label">
                Name visibility
                <select
                  className="field"
                  value={roomForm.name_visibility}
                  onChange={(event) => setRoomForm({ ...roomForm, name_visibility: event.target.value as Room["name_visibility"] })}
                >
                  <option value="real_names">Real names</option>
                  <option value="aliases">Aliases</option>
                  <option value="self_only">Self only</option>
                  <option value="anonymous">Anonymous</option>
                </select>
              </label>

              <label className="field-label">
                Score visibility
                <select
                  className="field"
                  value={roomForm.score_visibility}
                  onChange={(event) => setRoomForm({ ...roomForm, score_visibility: event.target.value as Room["score_visibility"] })}
                >
                  <option value="all_scores">All scores</option>
                  <option value="places_only">Places only</option>
                  <option value="self_only">Self only</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>

              <label className="field-label">
                Leaderboard visibility
                <select
                  className="field"
                  value={roomForm.leaderboard_visibility}
                  onChange={(event) =>
                    setRoomForm({ ...roomForm, leaderboard_visibility: event.target.value as Room["leaderboard_visibility"] })
                  }
                >
                  <option value="public">Public</option>
                  <option value="participants_only">Participants only</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>

              <label className="field-label">
                All-required bonus points
                <input
                  className="field mono-data"
                  inputMode="decimal"
                  step="any"
                  type="number"
                  value={roomForm.all_required_bonus_points}
                  onChange={(event) => setRoomForm({ ...roomForm, all_required_bonus_points: Number(event.target.value) })}
                />
              </label>
            </div>

            <div className="grid gap-3">
              <label className="toggle-row">
                <input checked={roomForm.registration_enabled} onChange={(event) => setRoomForm({ ...roomForm, registration_enabled: event.target.checked })} type="checkbox" />
                <span>
                  <span className="block font-medium text-ink">Registration enabled</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">Allow Telegram users to register with this room code.</span>
                </span>
              </label>

              <label className="toggle-row">
                <input checked={roomForm.public_access_enabled} onChange={(event) => setRoomForm({ ...roomForm, public_access_enabled: event.target.checked })} type="checkbox" />
                <span>
                  <span className="block font-medium text-ink">Public room page</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">Allow guests to open the leaderboard on the web with the room code.</span>
                </span>
              </label>

              <label className="toggle-row">
                <input checked={roomForm.notifications_enabled} onChange={(event) => setRoomForm({ ...roomForm, notifications_enabled: event.target.checked })} type="checkbox" />
                <span>
                  <span className="block font-medium text-ink">Telegram reminders</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">Send automated reminder messages before the daily deadline.</span>
                </span>
              </label>

              <label className="toggle-row">
                <input checked={roomForm.send_daily_summary} onChange={(event) => setRoomForm({ ...roomForm, send_daily_summary: event.target.checked })} type="checkbox" />
                <span>
                  <span className="block font-medium text-ink">Daily summary</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">Send each participant their daily total, overall score, and rank.</span>
                </span>
              </label>
            </div>

            {saveRoomMutation.error instanceof Error ? (
              <div className="rounded-lg border border-red-200 bg-redSoft px-4 py-3 text-sm text-[#9f2f2d]">
                {saveRoomMutation.error.message}
              </div>
            ) : null}

            <button className="button-primary w-full md:w-fit" disabled={saveRoomMutation.isPending} onClick={handleSaveRoom}>
              {saveRoomMutation.isPending ? "Saving settings..." : "Save settings"}
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Live room summary"
          eyebrow="Visibility"
          description="This is how the room is currently configured for public access, names, scores, and leaderboard exposure."
          className="h-fit"
        >
          <div className="grid gap-4">
            <article className="surface-muted p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                <GlobeHemisphereWest size={20} weight="duotone" />
              </div>
              <div className="eyebrow">Leaderboard visibility</div>
              <div className="mt-2 text-lg font-semibold text-ink">{formatLeaderboardVisibility(roomForm.leaderboard_visibility)}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Public viewers can only open this room if public access is enabled and the room is not archived.
              </p>
            </article>

            <article className="surface-muted p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                <StudentIcon size={20} weight="duotone" />
              </div>
              <div className="eyebrow">Name visibility</div>
              <div className="mt-2 text-lg font-semibold text-ink">{formatNameVisibility(roomForm.name_visibility)}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">Participant display names on leaderboard and public pages follow this rule.</p>
            </article>

            <article className="surface-muted p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                <ChartBar size={20} weight="duotone" />
              </div>
              <div className="eyebrow">Score visibility</div>
              <div className="mt-2 text-lg font-semibold text-ink">{formatScoreVisibility(roomForm.score_visibility)}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">Leaderboard points can be fully visible, partly visible, or hidden from viewers.</p>
            </article>

            <article className="surface-muted p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-accent">
                <TelegramLogo size={20} weight="duotone" />
              </div>
              <div className="eyebrow">Notifications</div>
              <div className="mt-2 text-lg font-semibold text-ink">{roomForm.notifications_enabled ? "Enabled" : "Disabled"}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                First reminder at {roomForm.first_reminder_time || "not set"}, second reminder at {roomForm.second_reminder_time || "not set"}.
              </p>
            </article>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Tasks"
        eyebrow={taskForm.id ? "Edit task" : "Create task"}
        description="Tasks define how participants submit daily progress and how points are calculated."
      >
        <form className="space-y-5" onSubmit={handleTaskSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field-label">
              Task name
              <input className="field" placeholder="Kitap" value={taskForm.name} onChange={(event) => setTaskForm({ ...taskForm, name: event.target.value })} />
            </label>

            <label className="field-label">
              Task type
              <select className="field" value={taskForm.type} onChange={(event) => setTaskForm({ ...taskForm, type: event.target.value as Task["type"] })}>
                <option value="quantity">Quantity</option>
                <option value="range">Range</option>
                <option value="yes_no">Yes / No</option>
                <option value="text">Text</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="field-label">
              Target
              <input className="field mono-data" type="number" value={taskForm.target} onChange={(event) => setTaskForm({ ...taskForm, target: Number(event.target.value) })} />
            </label>

            <label className="field-label">
              Max target
              <input className="field mono-data" type="number" value={taskForm.target_max} onChange={(event) => setTaskForm({ ...taskForm, target_max: Number(event.target.value) })} />
            </label>

            <label className="field-label">
              Points
              <input
                className="field mono-data"
                inputMode="decimal"
                step="any"
                type="number"
                value={taskForm.points}
                onChange={(event) => setTaskForm({ ...taskForm, points: Number(event.target.value) })}
              />
            </label>

            <label className="field-label">
              Bonus per unit
              <input
                className="field mono-data"
                inputMode="decimal"
                step="any"
                type="number"
                value={taskForm.bonus_per_unit}
                onChange={(event) => setTaskForm({ ...taskForm, bonus_per_unit: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="field-label">
              Sort order
              <input className="field mono-data" type="number" value={taskForm.sort_order} onChange={(event) => setTaskForm({ ...taskForm, sort_order: Number(event.target.value) })} />
            </label>

            <div className="grid gap-3">
              <label className="toggle-row">
                <input checked={taskForm.is_required} onChange={(event) => setTaskForm({ ...taskForm, is_required: event.target.checked })} type="checkbox" />
                <span>
                  <span className="block font-medium text-ink">Required for all-required bonus</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">This task must be completed to unlock the room-level bonus.</span>
                </span>
              </label>

              <label className="toggle-row">
                <input checked={taskForm.is_active} onChange={(event) => setTaskForm({ ...taskForm, is_active: event.target.checked })} type="checkbox" />
                <span>
                  <span className="block font-medium text-ink">Task is active</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">Inactive tasks stay in the room history but disappear from daily submissions.</span>
                </span>
              </label>
            </div>
          </div>

          {saveTaskMutation.error instanceof Error ? (
            <div className="rounded-lg border border-red-200 bg-redSoft px-4 py-3 text-sm text-[#9f2f2d]">
              {saveTaskMutation.error.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button className="button-primary" type="submit">
              {taskForm.id ? "Save task" : "Add task"}
            </button>
            {taskForm.id ? (
              <button className="button-secondary" type="button" onClick={() => setTaskForm(emptyTaskForm())}>
                Cancel editing
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-8">
          {tasks.length ? (
            <div className="overflow-x-auto">
              <table className="grid-table min-w-full">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Points</th>
                    <th>Bonus</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div className="font-medium text-ink">{task.name}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {task.is_required ? <StatusBadge label="Required" tone="warning" /> : null}
                          <StatusBadge label={task.is_active ? "Active" : "Inactive"} tone={task.is_active ? "success" : "neutral"} />
                        </div>
                      </td>
                      <td>{formatTaskType(task.type)}</td>
                      <td>{formatTaskTarget(task)}</td>
                      <td className="mono-data">{task.points}</td>
                      <td className="mono-data">{task.bonus_per_unit}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="button-secondary"
                            type="button"
                            onClick={() =>
                              setTaskForm({
                                id: task.id,
                                name: task.name,
                                type: task.type,
                                target: Number(task.target ?? 0),
                                target_max: Number(task.target_max ?? 0),
                                points: task.points,
                                bonus_per_unit: task.bonus_per_unit,
                                is_required: task.is_required,
                                is_active: task.is_active,
                                sort_order: task.sort_order
                              })
                            }
                          >
                            Edit
                          </button>
                          <button
                            className="button-secondary !border-red-200 !text-[#9f2f2d]"
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete task "${task.name}"?`)) {
                                deleteTaskMutation.mutate(task.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={ListChecks}
              title="No tasks yet"
              description="Add the first task to define how students submit progress and how points are awarded."
              compact
            />
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Students"
        eyebrow={studentForm.id ? "Edit student" : "Create student"}
        description="Students can be created manually or registered through Telegram with the room code."
      >
        <form className="space-y-5" onSubmit={handleStudentSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field-label">
              Name
              <input className="field" placeholder="Aruzhan" value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} />
            </label>

            <label className="field-label">
              Alias
              <input className="field" placeholder="Quiet Falcon" value={studentForm.alias} onChange={(event) => setStudentForm({ ...studentForm, alias: event.target.value })} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="field-label">
              Status
              <select className="field" value={studentForm.status} onChange={(event) => setStudentForm({ ...studentForm, status: event.target.value as Student["status"] })}>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>

            <label className="field-label">
              Telegram ID
              <input className="field mono-data" placeholder="123456789" value={studentForm.telegram_id} onChange={(event) => setStudentForm({ ...studentForm, telegram_id: event.target.value })} />
            </label>

            <label className="field-label">
              Telegram username
              <input className="field" placeholder="@username" value={studentForm.telegram_username} onChange={(event) => setStudentForm({ ...studentForm, telegram_username: event.target.value })} />
            </label>
          </div>

          <label className="toggle-row">
            <input
              checked={studentForm.is_registered_in_telegram}
              onChange={(event) => setStudentForm({ ...studentForm, is_registered_in_telegram: event.target.checked })}
              type="checkbox"
            />
            <span>
              <span className="block font-medium text-ink">Registered through Telegram</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">Mark this if the student profile is linked to the bot registration flow.</span>
            </span>
          </label>

          {saveStudentMutation.error instanceof Error ? (
            <div className="rounded-lg border border-red-200 bg-redSoft px-4 py-3 text-sm text-[#9f2f2d]">
              {saveStudentMutation.error.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button className="button-primary" type="submit">
              {studentForm.id ? "Save student" : "Add student"}
            </button>
            {studentForm.id ? (
              <button className="button-secondary" type="button" onClick={() => setStudentForm(emptyStudentForm())}>
                Cancel editing
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-8">
          {students.length ? (
            <div className="overflow-x-auto">
              <table className="grid-table min-w-full">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Telegram</th>
                    <th>Total score</th>
                    <th>Last submission</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <div className="font-medium text-ink">{student.name}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {student.alias ? <StatusBadge label={student.alias} tone="info" /> : null}
                          <StatusBadge
                            label={formatStudentStatus(student.status)}
                            tone={student.status === "active" ? "success" : "danger"}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-ink">{formatStudentSource(student)}</div>
                        <div className="mt-1 text-sm text-muted">{student.is_registered_in_telegram ? "Telegram linked" : "Manual entry"}</div>
                      </td>
                      <td className="mono-data">{student.total_score}</td>
                      <td>{formatDateTime(student.last_submission_at)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="button-secondary"
                            type="button"
                            onClick={() =>
                              setStudentForm({
                                id: student.id,
                                name: student.name,
                                alias: student.alias ?? "",
                                telegram_id: student.telegram_id ?? "",
                                telegram_username: student.telegram_username ?? "",
                                is_registered_in_telegram: student.is_registered_in_telegram,
                                status: student.status
                              })
                            }
                          >
                            Edit
                          </button>
                          <button
                            className="button-secondary !border-red-200 !text-[#9f2f2d]"
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete student "${student.name}"?`)) {
                                deleteStudentMutation.mutate(student.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={UsersThree}
              title="No students yet"
              description="Students will appear here after Telegram registration or manual creation."
              compact
            />
          )}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard
          title="Leaderboard"
          eyebrow="Live ranking"
          description="Leaderboard order refreshes after submissions, manual edits, or penalty changes."
        >
          {leaderboard.length ? (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <article key={entry.student_id} className="reveal rounded-lg border border-line bg-[#f7f6f2]/72 p-4" style={{ ["--index" as string]: index }}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={`#${entry.position}`} tone={leaderboardTone(entry)} />
                        <StatusBadge label={`${entry.completed_days} completed days`} />
                      </div>
                      <div className="text-lg font-semibold text-ink">{entry.display_name}</div>
                      <div className="text-sm text-muted">{entry.last_submission_at ? `Last submission ${formatDateTime(entry.last_submission_at)}` : "No submissions yet"}</div>
                    </div>
                    <div className="grid gap-2 text-left md:text-right">
                      <div className="mono-data text-2xl font-semibold tracking-[-0.04em] text-ink">{entry.score_visible ? `${entry.total_points} pts` : "Hidden"}</div>
                      <div className="text-sm text-muted">{entry.score_visible ? `Today ${entry.today_points} pts` : "Score hidden"}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Medal}
              title="No ranking data yet"
              description="Ranking becomes visible after students submit answers or organisers add progress manually."
              compact
            />
          )}
        </SectionCard>

        <SectionCard
          title="Penalties"
          eyebrow={punishmentForm.id ? "Edit penalty" : "Create penalty"}
          description="Use penalties for rule violations, missed requirements, or additional corrective tasks."
        >
          <form className="space-y-5" onSubmit={handlePunishmentSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-label">
                Student
                <select className="field" value={punishmentForm.student_id} onChange={(event) => setPunishmentForm({ ...punishmentForm, student_id: Number(event.target.value) })}>
                  <option value={0}>Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                Status
                <select className="field" value={punishmentForm.status} onChange={(event) => setPunishmentForm({ ...punishmentForm, status: event.target.value as Punishment["status"] })}>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            <label className="field-label">
              Penalty type
              <input className="field" placeholder="Plank for 2 minutes" value={punishmentForm.type} onChange={(event) => setPunishmentForm({ ...punishmentForm, type: event.target.value })} />
            </label>

            <label className="field-label">
              Reason
              <textarea className="field min-h-24 resize-y" placeholder="Why is this penalty assigned?" value={punishmentForm.reason} onChange={(event) => setPunishmentForm({ ...punishmentForm, reason: event.target.value })} />
            </label>

            {savePunishmentMutation.error instanceof Error ? (
              <div className="rounded-lg border border-red-200 bg-redSoft px-4 py-3 text-sm text-[#9f2f2d]">
                {savePunishmentMutation.error.message}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button className="button-primary" type="submit">
                {punishmentForm.id ? "Save penalty" : "Assign penalty"}
              </button>
              {punishmentForm.id ? (
                <button className="button-secondary" type="button" onClick={() => setPunishmentForm(emptyPunishmentForm())}>
                  Cancel editing
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-8">
            {punishments.length ? (
              <div className="overflow-x-auto">
                <table className="grid-table min-w-full">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Penalty</th>
                      <th>Status</th>
                      <th>Assigned</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {punishments.map((punishment) => (
                      <tr key={punishment.id}>
                        <td>{studentNameMap[punishment.student_id] ?? punishment.student_id}</td>
                        <td>
                          <div className="font-medium text-ink">{punishment.type}</div>
                          <div className="mt-1 text-sm text-muted">{punishment.reason}</div>
                        </td>
                        <td>
                          <StatusBadge
                            label={formatPunishmentStatus(punishment.status)}
                            tone={punishment.status === "completed" ? "success" : "warning"}
                          />
                        </td>
                        <td>{formatDate(punishment.assigned_at)}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="button-secondary"
                              type="button"
                              onClick={() =>
                                setPunishmentForm({
                                  id: punishment.id,
                                  student_id: punishment.student_id,
                                  type: punishment.type,
                                  reason: punishment.reason,
                                  status: punishment.status
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              className="button-secondary !border-red-200 !text-[#9f2f2d]"
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete penalty "${punishment.type}"?`)) {
                                  deletePunishmentMutation.mutate(punishment.id);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={ShieldWarning}
                title="No penalties"
                description="Assigned penalties will appear here with their current completion state."
                compact
              />
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Daily progress"
        eyebrow="Progress by date"
        description="Review who submitted, what they answered, and how many points were awarded on a specific date."
        action={
          <label className="field-label min-w-[180px]">
            <span className="eyebrow">Date</span>
            <input className="field mono-data" type="date" value={progressDate} onChange={(event) => setProgressDate(event.target.value)} />
          </label>
        }
      >
        {progress.length ? (
          <div className="overflow-x-auto">
            <table className="grid-table min-w-full">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Submitted</th>
                  <th>Day score</th>
                  <th>Total score</th>
                  <th>Answers</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((row) => (
                  <tr key={row.student_id}>
                    <td>{row.student_name}</td>
                    <td>
                      <StatusBadge label={row.submitted ? "Submitted" : "Missing"} tone={row.submitted ? "success" : "warning"} />
                    </td>
                    <td className="mono-data">{row.day_points}</td>
                    <td className="mono-data">{row.total_points}</td>
                    <td className="copy-pretty text-sm text-muted">{formatProgressAnswers(row.answers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ClockCountdown}
            title="No progress for this date"
            description="Choose another date or wait for participants to submit their daily task answers."
            compact
          />
        )}
      </SectionCard>
    </div>
  );
}
