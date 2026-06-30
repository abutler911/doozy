export const PRIORITIES = [
  { value: 4, label: "Urgent", short: "Urgent", className: "p-urgent" },
  { value: 3, label: "High", short: "High", className: "p-high" },
  { value: 2, label: "Medium", short: "Med", className: "p-medium" },
  { value: 1, label: "Low", short: "Low", className: "p-low" },
];

export function priorityMeta(value) {
  return PRIORITIES.find((p) => p.value === value) || PRIORITIES[2];
}

export const RECURRENCES = [
  { value: "", label: "Doesn't repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function recurrenceLabel(value) {
  return RECURRENCES.find((r) => r.value === value)?.label || "";
}

// Google Keep-style note colors. `key` is what the server stores; the actual
// pastel (light) / muted (dark) surfaces are defined in index.css, keyed by
// the `data-color` attribute. `swatch` is only used to render the picker dots.
export const NOTE_COLORS = [
  { key: "default", label: "Default", swatch: "var(--surface)" },
  { key: "coral", label: "Coral", swatch: "#f8c4bb" },
  { key: "peach", label: "Peach", swatch: "#fadcb3" },
  { key: "sand", label: "Sand", swatch: "#fdf1b8" },
  { key: "mint", label: "Mint", swatch: "#c9efd8" },
  { key: "sage", label: "Sage", swatch: "#d6e8d0" },
  { key: "fog", label: "Fog", swatch: "#c6e3f3" },
  { key: "dusk", label: "Dusk", swatch: "#d6c9f5" },
  { key: "blossom", label: "Blossom", swatch: "#f6c9e4" },
];
