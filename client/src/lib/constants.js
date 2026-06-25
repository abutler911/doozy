export const PRIORITIES = [
  { value: 4, label: "Urgent", short: "Urgent", className: "p-urgent" },
  { value: 3, label: "High", short: "High", className: "p-high" },
  { value: 2, label: "Medium", short: "Med", className: "p-medium" },
  { value: 1, label: "Low", short: "Low", className: "p-low" },
];

export function priorityMeta(value) {
  return PRIORITIES.find((p) => p.value === value) || PRIORITIES[2];
}
