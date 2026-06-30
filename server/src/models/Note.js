import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Allowed note colors. The client maps each key to a pastel surface (light)
 * and a muted surface (dark) via CSS, so the server only stores the key.
 * "default" means the note uses the regular card surface.
 */
export const NOTE_COLORS = [
  "default",
  "coral",
  "peach",
  "sand",
  "mint",
  "sage",
  "fog",
  "dusk",
  "blossom",
];

/**
 * A Note is a free-form Google Keep-style card: an optional title plus a body,
 * tinted with a color, that can be pinned to the top or tucked away in the
 * archive. Notes are independent of tasks — their own little board.
 */
const noteSchema = new Schema(
  {
    title: { type: String, default: "", trim: true, maxlength: 200 },
    body: { type: String, default: "", maxlength: 20000 },

    color: { type: String, enum: NOTE_COLORS, default: "default" },

    // Pinned notes float to the top of the board.
    pinned: { type: Boolean, default: false, index: true },
    // Archived notes leave the main board and live in the Archive view.
    archived: { type: Boolean, default: false, index: true },

    // Manual ordering within the board (lower = earlier).
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Board order: pinned first, then manual order, then most-recently touched.
noteSchema.index({ pinned: -1, order: 1, updatedAt: -1 });

export const Note = mongoose.model("Note", noteSchema);
