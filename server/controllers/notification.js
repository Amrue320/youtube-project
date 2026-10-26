import notification from "../Modals/notification.js";

// CREATE NOTIFICATION
export const createNotification = async (req, res) => {
    try {
        const {
            recipient,
            sender,
            type,
            message,
            video,
        } = req.body;

        if (!recipient || !sender || !type || !message) {
            return res.status(400).json({
                success: false,
                message: "Required notification fields are missing.",
            });
        }

        const newNotification = await notification.create({
            recipient,
            sender,
            type,
            message,
            video: video || null,
        });

        return res.status(201).json({
            success: true,
            notification: newNotification,
        });
    } catch (error) {
        console.error("Create notification error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create notification.",
        });
    }
};


// GET USER NOTIFICATIONS
export const getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        const notifications = await notification
            .find({ recipient: userId })
            .populate("sender", "name image channelname")
            .populate("video", "videotitle filepath")
            .sort({ createdAt: -1 });

        const unreadCount = await notification.countDocuments({
            recipient: userId,
            read: false,
        });

        return res.status(200).json({
            success: true,
            notifications,
            unreadCount,
        });
    } catch (error) {
        console.error("Get notifications error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch notifications.",
        });
    }
};


// MARK ONE NOTIFICATION AS READ
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const updatedNotification =
            await notification.findByIdAndUpdate(
                id,
                { read: true },
                { new: true }
            );

        if (!updatedNotification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        return res.status(200).json({
            success: true,
            notification: updatedNotification,
        });
    } catch (error) {
        console.error("Mark notification read error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to mark notification as read.",
        });
    }
};


// MARK ALL NOTIFICATIONS AS READ
export const markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        await notification.updateMany(
            {
                recipient: userId,
                read: false,
            },
            {
                $set: { read: true },
            }
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read.",
        });
    } catch (error) {
        console.error(
            "Mark all notifications read error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to mark notifications as read.",
        });
    }
};


// DELETE NOTIFICATION
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedNotification =
            await notification.findByIdAndDelete(id);

        if (!deletedNotification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully.",
        });
    } catch (error) {
        console.error("Delete notification error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete notification.",
        });
    }
};