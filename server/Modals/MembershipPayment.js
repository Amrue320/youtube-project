
import mongoose from "mongoose";

const membershipPaymentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
            index: true,
        },
        plan: {
            type: String,
            enum: ["bronze", "silver", "gold"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "INR",
        },
        status: {
            type: String,
            enum: ["pending", "succeeded", "failed"],
            default: "pending",
        },
        provider: {
            type: String,
            default: "mock",
        },
        reference: {
            type: String,
            required: true,
            unique: true,
        },
        activatedAt: {
            type: Date,
            default: null,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model(
    "MembershipPayment",
    membershipPaymentSchema
);
