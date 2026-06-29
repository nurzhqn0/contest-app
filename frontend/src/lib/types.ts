export type RoomStatus = "active" | "upcoming" | "archived";
export type TaskType = "quantity" | "range" | "yes_no" | "text";
export type StudentStatus = "active" | "blocked";

export interface Organizer {
  id: number;
  username: string;
  created_at: string;
}

export interface Room {
  id: number;
  name: string;
  description: string;
  status: RoomStatus;
  room_code: string;
  registration_enabled: boolean;
  public_access_enabled: boolean;
  leaderboard_visibility: "public" | "participants_only" | "hidden";
  name_visibility: "real_names" | "aliases" | "self_only" | "anonymous";
  score_visibility: "all_scores" | "places_only" | "self_only" | "hidden";
  notifications_enabled: boolean;
  first_reminder_time?: string | null;
  second_reminder_time?: string | null;
  daily_deadline: string;
  send_daily_summary: boolean;
  all_required_bonus_points: number;
  created_at: string;
  updated_at: string;
  tasks_count: number;
  students_count: number;
}

export interface DashboardData {
  total_rooms: number;
  active_rooms: number;
  total_students: number;
  submitted_today: number;
  missed_today: number;
  top_students: LeaderboardRow[];
  recent_rooms: Room[];
}

export interface Task {
  id: number;
  room_id: number;
  name: string;
  type: TaskType;
  target?: number | null;
  target_max?: number | null;
  points: number;
  bonus_per_unit: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  room_id: number;
  name: string;
  alias?: string | null;
  telegram_id?: string | null;
  telegram_username?: string | null;
  is_registered_in_telegram: boolean;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
  last_submission_at?: string | null;
  total_score: number;
}

export interface LeaderboardRow {
  student_id: number;
  position: number;
  display_name: string;
  total_points: number;
  today_points: number;
  completed_days: number;
  last_submission_at?: string | null;
  score_visible: boolean;
}

export interface ProgressRow {
  student_id: number;
  student_name: string;
  submitted: boolean;
  day_points: number;
  total_points: number;
  answers: Record<string, string>;
}

export interface Punishment {
  id: number;
  room_id: number;
  student_id: number;
  type: string;
  reason: string;
  status: "pending" | "completed";
  assigned_at: string;
  completed_at?: string | null;
}

export interface TaskAnalytics {
  task_id: number;
  task_name: string;
  task_type: TaskType;
  is_numeric: boolean;
  submissions: number;
  completion_rate: number;
  yes_count: number | null;
  total: number | null;
  average: number | null;
  maximum: number | null;
  minimum: number | null;
  median: number | null;
}

export interface StudentTaskTotal {
  task_id: number;
  total: number;
}

export interface StudentAnalytics {
  student_id: number;
  student_name: string;
  days_participated: number;
  longest_streak: number;
  best_entry: number | null;
  per_task_totals: StudentTaskTotal[];
}

export interface DailyParticipation {
  date: string;
  active_students: number;
}

export interface RoomAnalytics {
  total_distinct_days: number;
  numeric_task_ids: number[];
  breakdown_task_ids: number[];
  tasks: TaskAnalytics[];
  students: StudentAnalytics[];
  daily_participation: DailyParticipation[];
}

export interface PublicRoom {
  id: number;
  name: string;
  description: string;
  room_code: string;
  status: RoomStatus;
  leaderboard: LeaderboardRow[];
  tasks: Task[];
}
