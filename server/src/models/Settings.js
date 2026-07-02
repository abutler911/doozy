import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Single-document settings for the (single) user. We always read/write the
 * one doc with key "global".
 */
const settingsSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true },

    // Override the env REMINDER_PHONE from the UI if set.
    phone: { type: String, default: "" },

    // Daily summary text: send a morning rundown of today's tasks.
    dailySummaryEnabled: { type: Boolean, default: false },
    dailySummaryTime: { type: String, default: "08:00" }, // "HH:mm"
    lastSummarySent: { type: String, default: null }, // "YYYY-MM-DD"

    // Web push: when on, reminders & summary also fire as push notifications.
    pushEnabled: { type: Boolean, default: false },

    // Streak-at-risk nudge: in the evening, warn about rituals with a live
    // streak that haven't been done yet today.
    streakNudgeEnabled: { type: Boolean, default: false },
    streakNudgeTime: { type: String, default: "20:00" }, // "HH:mm"
    lastStreakNudgeSent: { type: String, default: null }, // "YYYY-MM-DD"
  },
  { timestamps: true }
);

settingsSchema.statics.getGlobal = async function getGlobal() {
  let doc = await this.findOne({ key: "global" });
  if (!doc) doc = await this.create({ key: "global" });
  return doc;
};

export const Settings = mongoose.model("Settings", settingsSchema);
