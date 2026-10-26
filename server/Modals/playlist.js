import mongoose from "mongoose";

const playlistschema = mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "videofiles",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "playlist",
  playlistschema
);