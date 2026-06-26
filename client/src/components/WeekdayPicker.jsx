import { WEEKDAY_LETTERS } from "../lib/dates.js";

/**
 * Pick which weekdays a ritual recurs on. Empty selection = every day.
 * value/onChange work with an array of weekday numbers (0=Sun..6=Sat).
 */
export default function WeekdayPicker({ value = [], onChange }) {
  function toggle(day) {
    if (value.includes(day)) onChange(value.filter((d) => d !== day));
    else onChange([...value, day].sort());
  }

  return (
    <div className="weekdays">
      <div className="weekday-row">
        {WEEKDAY_LETTERS.map((letter, day) => (
          <button
            type="button"
            key={day}
            className={`weekday ${value.includes(day) ? "weekday-on" : ""}`}
            onClick={() => toggle(day)}
            aria-pressed={value.includes(day)}
          >
            {letter}
          </button>
        ))}
      </div>
      <small className="weekday-hint">
        {value.length === 0 ? "Repeats every day" : "Repeats on selected days"}
      </small>
    </div>
  );
}
