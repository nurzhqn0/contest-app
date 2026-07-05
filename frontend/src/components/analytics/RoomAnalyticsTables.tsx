import { ClockCountdown, UsersThree } from "@phosphor-icons/react";
import { useMemo } from "react";
import { EmptyState } from "../EmptyState";
import {
  formatDate,
  formatMetric,
  formatPercent,
  formatTaskType,
} from "../../lib/labels";
import { RoomAnalytics } from "../../lib/types";

export default function RoomAnalyticsTables({
  analytics,
}: {
  analytics: RoomAnalytics;
}) {
  const numericTaskColumns = useMemo(() => {
    const nameById = new Map(
      analytics.tasks.map((task) => [task.task_id, task.task_name]),
    );
    return analytics.breakdown_task_ids.map((taskId) => ({
      taskId,
      name: nameById.get(taskId) ?? `#${taskId}`,
    }));
  }, [analytics]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="eyebrow">Per task</div>
        <div className="overflow-x-auto">
          <table className="grid-table min-w-full">
            <thead>
              <tr>
                <th>Task</th>
                <th>Type</th>
                <th>Submissions</th>
                <th>Completion</th>
                <th>Yes</th>
                <th>Total</th>
                <th>Average</th>
                <th>Maximum</th>
                <th>Minimum</th>
                <th>Median</th>
              </tr>
            </thead>
            <tbody>
              {analytics.tasks.map((row) => (
                <tr key={row.task_id}>
                  <td className="font-medium text-ink">{row.task_name}</td>
                  <td>{formatTaskType(row.task_type)}</td>
                  <td className="mono-data">{row.submissions}</td>
                  <td className="mono-data">
                    {formatPercent(row.completion_rate)}
                  </td>
                  <td className="mono-data">
                    {row.yes_count == null ? "—" : row.yes_count}
                  </td>
                  <td className="mono-data">{formatMetric(row.total)}</td>
                  <td className="mono-data">
                    {formatMetric(row.average)}
                  </td>
                  <td className="mono-data">
                    {formatMetric(row.maximum)}
                  </td>
                  <td className="mono-data">
                    {formatMetric(row.minimum)}
                  </td>
                  <td className="mono-data">{formatMetric(row.median)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="eyebrow">Per student</div>
        {analytics.students.length ? (
          <div className="overflow-x-auto">
            <table className="grid-table min-w-full">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Days participated</th>
                  <th>Longest streak</th>
                  <th>Best entry</th>
                  {numericTaskColumns.map((column) => (
                    <th key={column.taskId}>{column.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.students.map((row) => {
                  const totalById = new Map(
                    row.per_task_totals.map((item) => [
                      item.task_id,
                      item.total,
                    ]),
                  );
                  return (
                    <tr key={row.student_id}>
                      <td className="font-medium text-ink">
                        {row.student_name}
                      </td>
                      <td className="mono-data">
                        {row.days_participated}
                      </td>
                      <td className="mono-data">{row.longest_streak}</td>
                      <td className="mono-data">
                        {formatMetric(row.best_entry)}
                      </td>
                      {numericTaskColumns.map((column) => (
                        <td key={column.taskId} className="mono-data">
                          {formatMetric(
                            totalById.get(column.taskId) ?? 0,
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={UsersThree}
            title="No students yet"
            description="Per-student analytics appear after participants join the room."
            compact
          />
        )}
      </div>

      <div className="space-y-3">
        <div className="eyebrow">Daily participation</div>
        {analytics.daily_participation.length ? (
          <div className="overflow-x-auto">
            <table className="grid-table min-w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Active students</th>
                </tr>
              </thead>
              <tbody>
                {analytics.daily_participation.map((row) => (
                  <tr key={row.date}>
                    <td>{formatDate(row.date)}</td>
                    <td className="mono-data">{row.active_students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ClockCountdown}
            title="No participation data yet"
            description="Daily participation appears after the first submissions land."
            compact
          />
        )}
      </div>
    </div>
  );
}
