import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RoomAnalytics } from "../../lib/types";

type ChartCardProps = {
  title: string;
  hasData: boolean;
  children: React.ReactNode;
};

function ChartCard({ title, hasData, children }: ChartCardProps) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <div className="eyebrow mb-4">{title}</div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-line bg-[#f7f6f2]/72 text-sm text-muted">
          No data
        </div>
      )}
    </div>
  );
}

export default function AnalyticsCharts({
  analytics,
}: {
  analytics: RoomAnalytics;
}) {
  const dailyData = analytics.daily_participation;

  const taskData = analytics.tasks.map((task) => ({
    name: task.task_name,
    value: Math.round(task.completion_rate * 100),
  }));

  const studentData = analytics.students
    .filter((student) => student.best_entry != null)
    .map((student) => ({
      name: student.student_name,
      value: student.best_entry as number,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Daily participation" hasData={dailyData.length > 0}>
        <LineChart data={dailyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e3db" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="active_students"
            name="Active students"
            stroke="#b45309"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartCard>

      <ChartCard title="Per-task completion" hasData={taskData.length > 0}>
        <BarChart data={taskData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e3db" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" name="Completion %" fill="#b45309" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Per-student best entry (top 15)"
        hasData={studentData.length > 0}
      >
        <BarChart data={studentData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e3db" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" name="Best entry" fill="#0f766e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
