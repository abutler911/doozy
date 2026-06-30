import { NOTE_COLORS } from "../lib/constants.js";

/**
 * A row of color swatches for tinting a note. Controlled: pass the current
 * color `value` and an `onChange(key)` handler.
 */
export default function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker" role="radiogroup" aria-label="Note color">
      {NOTE_COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          className={`swatch ${value === c.key ? "swatch-on" : ""} ${
            c.key === "default" ? "swatch-default" : ""
          }`}
          style={{ background: c.swatch }}
          data-color={c.key}
          onClick={() => onChange(c.key)}
          role="radio"
          aria-checked={value === c.key}
          aria-label={c.label}
          title={c.label}
        >
          {value === c.key ? "✓" : ""}
        </button>
      ))}
    </div>
  );
}
