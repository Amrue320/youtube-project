import mongoose from "mongoose";

const notificationschema = mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },

        type: {
            type: String,
            enum: ["subscription", "comment", "like"],
            required: true,
        },

        message: {
            type: String,
            required: true,
        },

        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "videofiles",
            default: null,
        },

        read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("notification", notificationschema);