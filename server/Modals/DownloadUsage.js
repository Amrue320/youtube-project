
import mongoose from "mongoose";

const downloadUsageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },

        // Date of the download day in India (stored as YYYY-MM-DD)
        date: {
            type: String,
            required: true,
        },

        count: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// One usage record per user per day
downloadUsageSchema.index(
    { userId: 1, date: 1 },
    { unique: true }
);

export default mongoose.model(
    "DownloadUsage",
    downloadUsageSchema
);