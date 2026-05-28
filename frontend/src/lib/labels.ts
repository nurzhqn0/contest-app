import { LeaderboardRow, Punishment, Room, Student, Task } from "./types";

const roomStatusLabels: Record<Room["status"], string> = {
  active: "Active",
  upcoming: "Upcoming",
  archived: "Archived"
};

const taskTypeLabels: Record<Task["type"], string> = {
  quantity: "Quantity",
  range: "Range",
  yes_no: "Yes / No",
  text: "Text"
};

const nameVisibilityLabels: Record<Room["name_visibility"], string> = {
  real_names: "Real names",
  aliases: "Aliases",
  self_only: "Self only",
  anonymous: "Anonymous"
};

const scoreVisibilityLabels: Record<Room["score_visibility"], string> = {
  all_scores: "All scores",
  places_only: "Places only",
  self_only: "Self only",
  hidden: "Hidden"
};

const leaderboardVisibilityLabels: Record<Room["leaderboard_visibility"], string> = {
  public: "Public",
  participants_only: "Participants only",
  hidden: "Hidden"
};

const studentStatusLabels: Record<Student["status"], string> = {
  active: "Active",
  blocked: "Blocked"
};

const punishmentStatusLabels: Record<Punishment["status"], string> = {
  pending: "Pending",
  completed: "Completed"
};

export function formatRoomStatus(status: Room["status"]) {
  return roomStatusLabels[status];
}

export function formatTaskType(type: Task["type"]) {
  return taskTypeLabels[type];
}

export function formatNameVisibility(value: Room["name_visibility"]) {
  return nameVisibilityLabels[value];
}

export function formatScoreVisibility(value: Room["score_visibility"]) {
  return scoreVisibilityLabels[value];
}

export function formatLeaderboardVisibility(value: Room["leaderboard_visibility"]) {
  return leaderboardVisibilityLabels[value];
}

export function formatStudentStatus(value: Student["status"]) {
  return studentStatusLabels[value];
}

export function formatPunishmentStatus(value: Punishment["status"]) {
  return punishmentStatusLabels[value];
}

export function formatTaskTarget(task: Pick<Task, "target" | "target_max" | "type">) {
  if (task.type === "yes_no") {
    return "Completion";
  }
  if (task.type === "text") {
    return "Short answer";
  }
  if (task.target == null && task.target_max == null) {
    return "Not set";
  }
  if (task.target_max != null && task.target_max !== 0) {
    return `${task.target ?? 0} to ${task.target_max}`;
  }
  return `${task.target ?? 0}`;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatStudentSource(student: Student) {
  return student.telegram_username || student.telegram_id || "Manual";
}

export function formatProgressAnswers(answers: Record<string, string>) {
  const entries = Object.entries(answers);
  if (!entries.length) {
    return "No answers";
  }
  return entries.map(([taskName, value]) => `${taskName}: ${value}`).join(" | ");
}

export function scoreText(row: Pick<LeaderboardRow, "score_visible" | "total_points">) {
  return row.score_visible ? `${row.total_points} pts` : "Hidden";
}
