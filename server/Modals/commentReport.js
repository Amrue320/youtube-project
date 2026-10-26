
import mongoose from "mongoose";

const commentReportSchema = new mongoose.Schema(
    {
        commentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "comment",
            required: true,
        },
        reporterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300,
        },
        status: {
            type: String,
            enum: ["pending", "reviewed", "dismissed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

commentReportSchema.index(
    { commentId: 1, reporterId: 1 },
    { unique: true }
);

export default mongoose.model("commentReport", commentReportSchema);
