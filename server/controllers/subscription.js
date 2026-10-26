import subscription from "../Modals/subscription.js";
import users from "../Modals/Auth.js";
import notification from "../Modals/notification.js";

// SUBSCRIBE / UNSUBSCRIBE
export const handleSubscription = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { userId } = req.body;

        if (!userId || !channelId) {
            return res.status(400).json({
                success: false,
                message: "User ID and channel ID are required.",
            });
        }

        if (userId === channelId) {
            return res.status(400).json({
                success: false,
                message: "You cannot subscribe to yourself.",
            });
        }

        // Check if subscription already exists
        const existingSubscription =
            await subscription.findOne({
                subscriber: userId,
                channel: channelId,
            });

        // ================= UNSUBSCRIBE =================

        if (existingSubscription) {
            await subscription.findByIdAndDelete(
                existingSubscription._id
            );

            await users.findByIdAndUpdate(userId, {
                $pull: {
                    subscribedChannels: channelId,
                },
            });

            await users.findByIdAndUpdate(channelId, {
                $pull: {
                    subscribers: userId,
                },
            });

            const channel = await users.findById(channelId);

            return res.status(200).json({
                success: true,
                subscribed: false,
                subscribers:
                    channel?.subscribers?.length || 0,
            });
        }

        // ================= SUBSCRIBE =================

        await subscription.create({
            subscriber: userId,
            channel: channelId,
        });

        // Add channel to subscriber's subscribedChannels
        await users.findByIdAndUpdate(userId, {
            $addToSet: {
                subscribedChannels: channelId,
            },
        });

        // Add subscriber to channel owner's subscribers
        await users.findByIdAndUpdate(channelId, {
            $addToSet: {
                subscribers: userId,
            },
        });

        // ================= CREATE NOTIFICATION =================

        const sender = await users.findById(userId);
        const channel = await users.findById(channelId);

        if (sender && channel) {
            await notification.create({
                recipient: channelId,
                sender: userId,
                type: "subscription",
                message: `${sender.name || "Someone"} subscribed to your channel.`,
            });
        }

        return res.status(200).json({
            success: true,
            subscribed: true,
            subscribers:
                channel?.subscribers?.length || 0,
        });
    } catch (error) {
        console.error("Subscription error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update subscription.",
        });
    }
};


// CHECK SUBSCRIPTION
export const checkSubscription = async (req, res) => {
    try {
        const { channelId, userId } = req.params;

        if (!channelId || !userId) {
            return res.status(400).json({
                success: false,
                message: "Channel ID and user ID are required.",
            });
        }

        const existingSubscription =
            await subscription.findOne({
                subscriber: userId,
                channel: channelId,
            });

        const channel = await users.findById(channelId);

        return res.status(200).json({
            success: true,
            subscribed: Boolean(existingSubscription),
            subscribers:
                channel?.subscribers?.length || 0,
        });
    } catch (error) {
        console.error(
            "Check subscription error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to check subscription.",
        });
    }
};


// GET USER SUBSCRIPTIONS
export const getSubscriptions = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        const subscriptions =
            await subscription
                .find({
                    subscriber: userId,
                })
                .populate(
                    "channel",
                    "name channelname description image"
                )
                .sort({
                    createdAt: -1,
                });

        return res.status(200).json({
            success: true,
            subscriptions,
        });
    } catch (error) {
        console.error(
            "Get subscriptions error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch subscriptions.",
        });
    }
};