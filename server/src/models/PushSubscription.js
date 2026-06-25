import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * A Web Push subscription for one device/browser. The single user can have
 * several (phone, laptop, …). Keyed by the push endpoint, which is unique.
 */
const pushSubscriptionSchema = new Schema(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export const PushSubscription = mongoose.model(
  "PushSubscription",
  pushSubscriptionSchema
);
