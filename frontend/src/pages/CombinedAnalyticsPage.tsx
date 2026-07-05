import {
  CalendarBlank,
  ChartBar,
  DownloadSimple,
  Rows,
  UsersThree,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AnalyticsCharts from "../components/analytics/AnalyticsCharts";
import CombinedCharts from "../components/analytics/CombinedCharts";
import RoomAnalyticsTables from "../components/analytics/RoomAnalyticsTables";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { formatRoomStatus } from "../lib/labels";
import { MultiRoomAnalytics, Room } from "../lib/types";

function buildQueryString(ids: number[]) {
  return ids.map((id) => `room_ids=${id}`).join("&");
}

export function CombinedAnalyticsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [appliedIds, setAppliedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"combined" | "by_room">("combined");

  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api.get<Room[]>("/rooms"),
  });

  const analyticsQuery = useQuery({
    queryKey: ["multi-analytics", appliedIds],
    queryFn: () =>
      api.get<MultiRoomAnalytics>(
        `/rooms/analytics/aggregate?${buildQueryString(appliedIds)}`,
      ),
    enabled: appliedIds.length > 0,
  });

  const rooms = roomsQuery.data ?? [];
  const allSelected = rooms.length > 0 && selectedIds.size === rooms.length;

  function toggleRoom(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === rooms.length
        ? new Set()
        : new Set(rooms.map((room) => room.id)),
    );
  }

  function handleCombine() {
    setAppliedIds(Array.from(selectedIds));
  }

  const data = analyticsQuery.data;
  const selectedList = useMemo(
    () => Array.from(selectedIds),
    [selectedIds],
  );

  return (
    <div className="space-y-6 pb-12">
      <section
        className="surface reveal p-6 md:p-8"
        style={{ ["--index" as string]: 0 }}
      >
        <div className="space-y-5">
          <div className="eyebrow">Combined analytics</div>
          <h1 className="headline-balance max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-ink md:text-5xl">
            Compare and combine analytics across multiple rooms.
          </h1>
          <p className="copy-pretty max-w-[66ch] text-base leading-relaxed text-muted">
            Select the rooms you want to analyse together, then combine them to
            see aggregate summaries, charts, and detailed tables per room.
          </p>
        </div>
      </section>

      <SectionCard
        title="Select rooms"
        eyebrow="Workspace"
        description="Pick one or more rooms to include in the combined analytics view."
        action={
          rooms.length ? (
            <button
              type="button"
              className="button-secondary"
              onClick={toggleAll}
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          ) : null
        }
      >
        {roomsQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : rooms.length ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => {
                const checked = selectedIds.has(room.id);
                return (
                  <label
                    key={room.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      checked
                        ? "border-accent bg-accentSoft/35"
                        : "border-line bg-white hover:border-accent/35"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggleRoom(room.id)}
                    />
                    <span className="space-y-2">
                      <span className="block font-medium text-ink">
                        {room.name}
                      </span>
                      <StatusBadge
                        label={formatRoomStatus(room.status)}
                        tone={
                          room.status === "active"
                            ? "success"
                            : room.status === "upcoming"
                              ? "warning"
                              : "neutral"
                        }
                      />
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="button-primary"
                disabled={selectedList.length === 0}
                onClick={handleCombine}
              >
                <ChartBar size={16} weight="bold" />
                View analytics
                {selectedList.length ? ` (${selectedList.length})` : ""}
              </button>
              {appliedIds.length ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() =>
                    api.download(
                      `/rooms/analytics/aggregate/export?${buildQueryString(appliedIds)}`,
                    )
                  }
                >
                  <DownloadSimple size={16} weight="bold" />
                  Export Excel
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Rows}
            title="No rooms yet"
            description="Create rooms first to combine their analytics here."
          />
        )}
      </SectionCard>

      {appliedIds.length === 0 ? null : analyticsQuery.isLoading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-24 w-full" />
          <SkeletonBlock className="h-64 w-full" />
        </div>
      ) : analyticsQuery.error ? (
        <SectionCard title="Analytics" eyebrow="Combined">
          <EmptyState
            icon={ChartBar}
            title="Analytics could not be loaded"
            description={
              analyticsQuery.error instanceof Error
                ? analyticsQuery.error.message
                : "Try selecting the rooms again."
            }
          />
        </SectionCard>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Rooms"
              value={data.summary.room_count}
              detail="Rooms included in this combined view."
              icon={Rows}
              tone="accent"
            />
            <StatCard
              label="Total students"
              value={data.summary.total_students}
              detail="Participants across the selected rooms."
              icon={UsersThree}
            />
            <StatCard
              label="Total distinct days"
              value={data.summary.total_distinct_days}
              detail="Distinct active days across selected rooms."
              icon={CalendarBlank}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={
                viewMode === "combined" ? "button-primary" : "button-secondary"
              }
              onClick={() => setViewMode("combined")}
            >
              Combined
            </button>
            <button
              type="button"
              className={
                viewMode === "by_room" ? "button-primary" : "button-secondary"
              }
              onClick={() => setViewMode("by_room")}
            >
              By room
            </button>
          </div>

          {viewMode === "combined" ? (
            <div className="space-y-6">
              <CombinedCharts
                leaderboard={data.combined_leaderboard}
                comparison={data.room_comparison}
                daily={data.combined_daily}
              />
              <SectionCard
                title="Combined leaderboard"
                eyebrow="Combined"
              >
                {data.combined_leaderboard.length ? (
                  <div className="overflow-x-auto">
                    <table className="grid-table min-w-full">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Student</th>
                          <th>Room</th>
                          <th>Total pts</th>
                          <th>Today</th>
                          <th>Completed days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.combined_leaderboard.map((row) => (
                          <tr key={`${row.room_id}-${row.student_id}`}>
                            <td className="mono-data">{row.position}</td>
                            <td className="font-medium text-ink">
                              {row.student_name}
                            </td>
                            <td>{row.room_name}</td>
                            <td className="mono-data">{row.total_points}</td>
                            <td className="mono-data">{row.today_points}</td>
                            <td className="mono-data">{row.completed_days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={ChartBar}
                    title="No leaderboard data"
                    description="The selected rooms do not have leaderboard data yet."
                  />
                )}
              </SectionCard>
            </div>
          ) : data.rooms.length ? (
            data.rooms.map((block) => (
              <SectionCard
                key={block.room_id}
                title={block.room_name}
                eyebrow="Room analytics"
              >
                <div className="space-y-8">
                  <AnalyticsCharts analytics={block.analytics} />
                  <RoomAnalyticsTables analytics={block.analytics} />
                </div>
              </SectionCard>
            ))
          ) : (
            <EmptyState
              icon={ChartBar}
              title="No analytics data"
              description="The selected rooms do not have analytics data yet."
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
