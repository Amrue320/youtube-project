import mongoose from "mongoose";
import VideoProgress from "../Modals/videoProgress.js";


// ==========================================
// SAVE / UPDATE VIDEO PROGRESS
// ==========================================
export const saveVideoProgress = async (req, res) => {
    try {
        const {
            userId,
            videoId,
            watchedSeconds,
            duration,
            completed,
        } = req.body;

        if (!userId || !videoId) {
            return res.status(400).json({
                success: false,
                message: "User ID and Video ID are required.",
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(videoId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID or Video ID.",
            });
        }

        const watched = Math.max(
            0,
            Number(watchedSeconds) || 0
        );

        const videoDuration = Math.max(
            0,
            Number(duration) || 0
        );

        const isCompleted =
            Boolean(completed) ||
            (videoDuration > 0 &&
                watched >= videoDuration * 0.95);

        const progress =
            await VideoProgress.findOneAndUpdate(
                {
                    userId,
                    videoId,
                },
                {
                    $set: {
                        watchedSeconds: watched,
                        duration: videoDuration,
                        completed: isCompleted,
                        lastWatchedAt: new Date(),
                    },
                },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                }
            );

        return res.status(200).json({
            success: true,
            message: "Video progress saved.",
            progress,
        });
    } catch (error) {
        console.error(
            "Save video progress error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to save video progress.",
        });
    }
};


// ==========================================
// GET PROGRESS FOR ONE VIDEO
// ==========================================
export const getVideoProgress = async (req, res) => {
    try {
        const { userId, videoId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(videoId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID or Video ID.",
            });
        }

        const progress =
            await VideoProgress.findOne({
                userId,
                videoId,
            });

        return res.status(200).json({
            success: true,
            progress: progress || null,
        });
    } catch (error) {
        console.error(
            "Get video progress error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch video progress.",
        });
    }
};


// ==========================================
// GET USER CONTINUE WATCHING
// ==========================================
export const getContinueWatching = async (
    req,
    res
) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID.",
            });
        }

        const progress =
            await VideoProgress.find({
                userId,
                completed: false,
                watchedSeconds: { $gt: 0 },
            })
                .sort({ lastWatchedAt: -1 })
                .populate(
                    "videoId",
                    "videotitle videochanel filepath filename views Like category createdAt uploader"
                );

        return res.status(200).json({
            success: true,
            videos: progress,
        });
    } catch (error) {
        console.error(
            "Continue watching error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch continue watching videos.",
        });
    }
};


// ==========================================
// DELETE ONE VIDEO PROGRESS
// ==========================================
export const deleteVideoProgress = async (
    req,
    res
) => {
    try {
        const { userId, videoId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(videoId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID or Video ID.",
            });
        }

        await VideoProgress.findOneAndDelete({
            userId,
            videoId,
        });

        return res.status(200).json({
            success: true,
            message: "Video removed from Continue Watching.",
        });
    } catch (error) {
        console.error(
            "Delete video progress error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to remove video progress.",
        });
    }
};


// ==========================================
// CLEAR ALL CONTINUE WATCHING
// ==========================================
export const clearContinueWatching = async (
    req,
    res
) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID.",
            });
        }

        await VideoProgress.deleteMany({
            userId,
            completed: false,
        });

        return res.status(200).json({
            success: true,
            message:
                "Continue Watching history cleared.",
        });
    } catch (error) {
        console.error(
            "Clear continue watching error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to clear Continue Watching.",
        });
    }
};