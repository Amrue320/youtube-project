
import mongoose from "mongoose";
import User from "../Modals/Auth.js";

const PLAN_LIMITS = {
    free: 1,
    bronze: 5,
    silver: 15,
    gold: 30,
};

const getEffectivePlan = (user) => {
    const plan = String(user.plan || "free").toLowerCase();

    if (!PLAN_LIMITS[plan]) {
        return "free";
    }

    if (
        plan !== "free" &&
        user.planExpiresAt &&
        new Date(user.planExpiresAt) <= new Date()
    ) {
        return "free";
    }

    return plan;
};

// GET /subscription/plan/:userId
export const getMembershipPlan = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        const user = await User.findById(userId).select(
            "plan planExpiresAt"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const plan = getEffectivePlan(user);

        // Persist expiry when an expired paid plan is detected.
        if (plan === "free" && user.plan !== "free") {
            user.plan = "free";
            user.planExpiresAt = null;
            await user.save();
        }

        return res.status(200).json({
            success: true,
            plan,
            planExpiresAt: user.planExpiresAt,
            dailyDownloadLimit: PLAN_LIMITS[plan],
        });
    } catch (error) {
        console.error("Get membership plan error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve membership plan",
        });
    }
};

// POST /subscription/plan/cancel
// Body: { "userId": "..." }
export const cancelMembership = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID is required",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        user.plan = "free";
        user.planExpiresAt = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Membership changed to Free",
            plan: "free",
            dailyDownloadLimit: PLAN_LIMITS.free,
        });
    } catch (error) {
        console.error("Cancel membership error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to cancel membership",
        });
    }
};
