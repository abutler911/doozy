import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * A Task is either:
 *  - type "oneoff": a normal todo with a `completed` boolean.
 *  - type "daily":  a recurring habit (reading, piano, ...) that shows up
 *                   every day. It has no single `completed` flag; instead we
 *                   record the dates it was completed in `completedDates`
 *                   (YYYY-MM-DD). The task is "done today" only if today's
 *                   date is in that array, so it naturally resets each day.
 */
const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    notes: { type: String, default: "", maxlength: 2000 },

    type: {
      type: String,
      enum: ["oneoff", "daily"],
      default: "oneoff",
      index: true,
    },

    // 1 = low, 2 = medium, 3 = high, 4 = urgent
    priority: { type: Number, enum: [1, 2, 3, 4], default: 2 },

    // Manual ordering within a list (drag-to-reorder / nudge).
    order: { type: Number, default: 0 },

    // One-off tasks only.
    completed: { type: Boolean, default: false },
    dueDate: { type: Date, default: null },

    // Daily tasks only — list of "YYYY-MM-DD" the habit was completed.
    completedDates: { type: [String], default: [] },

    // --- SMS reminder config ---
    // "HH:mm" (24h) in the server timezone. null = no reminder.
    reminderTime: { type: String, default: null },
    reminderEnabled: { type: Boolean, default: false },
    // Tracks the last "YYYY-MM-DD" we sent a reminder, so we send at most
    // once per day per task.
    lastReminderSent: { type: String, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ type: 1, completed: 1, priority: -1, order: 1 });

export const Task = mongoose.model("Task", taskSchema);
