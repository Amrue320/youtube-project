
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import User from "../Modals/Auth.js";
import MembershipPayment from "../Modals/MembershipPayment.js";
import { sendMembershipConfirmationEmail } from "../utils/membershipEmail.js";

const PLANS = {
    bronze: { amount: 99, dailyLimit: 5 },
    silver: { amount: 199, dailyLimit: 15 },
    gold: { amount: 299, dailyLimit: 30 },
};

const isMockPaymentsEnabled = () =>
    process.env.MOCK_PAYMENTS_ENABLED?.trim().toLowerCase() === "true";

// POST /subscription/mock/create-order
// Body: { userId, plan }
export const createMockOrder = async (req, res) => {
    try {
        if (!isMockPaymentsEnabled()) {
            return res.status(403).json({
                success: false,
                message:
                    "Mock payments are disabled. Check server/.env and restart the backend.",
            });
        }

        const { userId, plan } = req.body;
        const normalizedPlan = String(plan || "").toLowerCase();

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID is required.",
            });
        }

        if (!PLANS[normalizedPlan]) {
            return res.status(400).json({
                success: false,
                message: "Choose Bronze, Silver, or Gold.",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const payment = await MembershipPayment.create({
            user: user._id,
            plan: normalizedPlan,
            amount: PLANS[normalizedPlan].amount,
            reference: `MOCK-${randomUUID()}`,
        });

        return res.status(201).json({
            success: true,
            demo: true,
            message: "Demo checkout created. No money will be charged.",
            paymentId: payment._id,
            reference: payment.reference,
            plan: payment.plan,
            amount: payment.amount,
            currency: payment.currency,
            dailyDownloadLimit: PLANS[normalizedPlan].dailyLimit,
        });
    } catch (error) {
        console.error("Create mock order error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not create demo checkout.",
        });
    }
};

// POST /subscription/mock/confirm
// Body: { userId, paymentId, outcome: "success" | "failure" }
export const confirmMockPayment = async (req, res) => {
    try {
        if (!isMockPaymentsEnabled()) {
            return res.status(403).json({
                success: false,
                message:
                    "Mock payments are disabled. Check server/.env and restart the backend.",
            });
        }

        const { userId, paymentId, outcome } = req.body;

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(paymentId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid user and payment IDs are required.",
            });
        }

        if (!["success", "failure"].includes(outcome)) {
            return res.status(400).json({
                success: false,
                message: "Outcome must be success or failure.",
            });
        }

        const payment = await MembershipPayment.findOne({
            _id: paymentId,
            user: userId,
            provider: "mock",
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Demo payment not found.",
            });
        }

        if (payment.status !== "pending") {
            return res.status(409).json({
                success: false,
                message: "This demo payment has already been processed.",
                status: payment.status,
            });
        }

        // Simulate a failed payment without changing membership.
        if (outcome === "failure") {
            payment.status = "failed";
            await payment.save();

            return res.status(200).json({
                success: true,
                demo: true,
                paymentStatus: "failed",
                message:
                    "Simulated payment failure. Your plan was not changed.",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const now = new Date();
        const currentExpiry = user.planExpiresAt
            ? new Date(user.planExpiresAt)
            : null;

        // Extend an active membership from its current expiry date.
        const startsAt =
            user.plan !== "free" &&
                currentExpiry &&
                currentExpiry > now
                ? currentExpiry
                : now;

        const expiresAt = new Date(startsAt);
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Save payment and activate membership.
        payment.status = "succeeded";
        payment.activatedAt = now;
        payment.expiresAt = expiresAt;
        await payment.save();

        user.plan = payment.plan;
        user.planExpiresAt = expiresAt;
        await user.save();

        // Send confirmation email after activation.
        // Email failure must not undo membership activation.
        let emailSent = false;

        try {
            emailSent = await sendMembershipConfirmationEmail({
                user,
                payment,
                dailyDownloadLimit: PLANS[payment.plan].dailyLimit,
            });
        } catch (emailError) {
            console.error(
                "Membership activated, but confirmation email failed:",
                emailError.message
            );
        }

        return res.status(200).json({
            success: true,
            demo: true,
            paymentStatus: "succeeded",
            emailSent,
            message: emailSent
                ? "Demo payment successful. Membership activated and confirmation email sent."
                : "Demo payment successful. Membership activated, but the confirmation email could not be sent.",
            plan: user.plan,
            planExpiresAt: user.planExpiresAt,
            dailyDownloadLimit: PLANS[user.plan].dailyLimit,
        });
    } catch (error) {
        console.error("Confirm mock payment error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not process demo payment.",
        });
    }
};
