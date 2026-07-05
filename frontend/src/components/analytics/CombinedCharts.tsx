import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CombinedDailyStat,
  CombinedLeaderboardRow,
  RoomComparisonRow,
} from "../../lib/types";

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

const ROOM_PALETTE = [
  "#b45309",
  "#0f766e",
  "#7c3aed",
  "#2563eb",
  "#dc2626",
  "#059669",
  "#d97706",
  "#0891b2",
];

export default function CombinedCharts({
  leaderboard,
  comparison,
  daily,
}: {
  leaderboard: CombinedLeaderboardRow[];
  comparison: RoomComparisonRow[];
  daily: CombinedDailyStat[];
}) {
  const roomColorMap = new Map<number, string>();
  const roomIds =
    comparison.length > 0
      ? comparison.map((row) => row.room_id)
      : Array.from(new Set(leaderboard.map((row) => row.room_id)));
  Array.from(new Set(roomIds)).forEach((roomId, index) => {
    roomColorMap.set(roomId, ROOM_PALETTE[index % ROOM_PALETTE.length]);
  });
  const colorForRoom = (roomId: number) =>
    roomColorMap.get(roomId) ?? ROOM_PALETTE[0];

  const leaderboardData = leaderboard.slice(0, 15).map((row) => ({
    name: row.student_name,
    value: row.total_points,
    room_id: row.room_id,
  }));

  const comparisonData = comparison.map((row) => ({
    name: row.room_name,
    total_points: row.total_points,
    average_points: row.average_points,
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Top students by points" hasData={leaderboard.length > 0}>
        <BarChart data={leaderboardData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e3db" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" name="Points" radius={[4, 4, 0, 0]}>
            {leaderboardData.map((row, index) => (
              <Cell key={index} fill={colorForRoom(row.room_id)} />
            ))}
          </Bar>
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Room comparison (total vs average)"
        hasData={comparison.length > 0}
      >
        <BarChart data={comparisonData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e3db" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="total_points"
            name="Total"
            fill="#b45309"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="average_points"
            name="Avg / student"
            fill="#0f766e"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Daily participation (combined)"
        hasData={daily.length > 0}
      >
        <LineChart data={daily}>
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

      <ChartCard
        title="Points trend"
        hasData={daily.some((d) => d.points > 0) || daily.length > 0}
      >
        <LineChart data={daily}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e3db" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="points"
            name="Points"
            stroke="#0f766e"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartCard>
    </div>
  );
}
