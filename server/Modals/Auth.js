
import mongoose from "mongoose";

const userschema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  name: {
    type: String,
  },

  channelname: {
    type: String,
  },

  description: {
    type: String,
  },

  image: {
    type: String,
  },

  // User role for moderation permissions
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  // Paid membership plan used for download limits
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
    lowercase: true,
  },

  // Expiry date for a paid membership
  // null means no expiry date is currently set
  planExpiresAt: {
    type: Date,
    default: null,
  },

  joinedon: {
    type: Date,
    default: Date.now,
  },

  // Channels this user has subscribed to
  subscribedChannels: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],

  // Users who subscribed to this channel
  subscribers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
});

export default mongoose.model("user", userschema);
