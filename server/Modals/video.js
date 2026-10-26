import mongoose from "mongoose";

const videochema = mongoose.Schema(
  {
    videotitle: {
      type: String,
      required: true,
    },

    filename: {
      type: String,
      required: true,
    },

    filetype: {
      type: String,
      required: true,
    },

    filepath: {
      type: String,
      required: true,
    },

    filesize: {
      type: String,
      required: true,
    },

    videochanel: {
      type: String,
      required: true,
    },

    // Video category
    category: {
      type: String,
      default: "All",
      enum: [
        "All",
        "Music",
        "Gaming",
        "Movies",
        "News",
        "Sports",
        "Technology",
        "Comedy",
        "Education",
        "Science",
        "Travel",
        "Food",
        "Fashion",
      ],
    },

    Like: {
      type: Number,
      default: 0,
    },

    views: {
      type: Number,
      default: 0,
    },

    uploader: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("videofiles", videochema);