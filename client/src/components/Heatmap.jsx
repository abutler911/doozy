import { lastNDays, currentStreak, bestStreak } from "../lib/dates.js";

const WEEKS = 13; // ~3 months

/**
 * GitHub-style consistency grid for a recurring task. Columns are weeks,
 * rows are weekdays (Sun→Sat). Completed days are filled with the accent.
 */
export default function Heatmap({ completedDates = [], repeatDays = [] }) {
  const done = new Set(completedDates);
  // Pad to a whole number of weeks ending today; align so rows are weekdays.
  const today = new Date();
  const padEnd = 6 - today.getDay(); // days remaining in the final week
  const days = lastNDays(WEEKS * 7 - padEnd);

  // Build week columns.
  const cells = days.map((date) => {
    const wd = new Date(`${date}T00:00:00`).getDay();
    const isDone = done.has(date);
    const scheduled = repeatDays.length === 0 || repeatDays.includes(wd);
    return { date, wd, isDone, scheduled };
  });

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const cur = currentStreak(completedDates, repeatDays);
  const best = bestStreak(completedDates, repeatDays);

  return (
    <div className="heatmap">
      <div className="heatmap-stats">
        <span><strong>{cur}</strong> day streak</span>
        <span><strong>{best}</strong> best</span>
        <span><strong>{completedDates.length}</strong> total</span>
      </div>
      <div className="heatmap-grid">
        {weeks.map((week, wi) => (
          <div className="heatmap-col" key={wi}>
            {week.map((c) => (
              <div
                key={c.date}
                className={`heatmap-cell ${c.isDone ? "hc-done" : c.scheduled ? "hc-miss" : "hc-off"}`}
                title={`${c.date}${c.isDone ? " ✓" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
