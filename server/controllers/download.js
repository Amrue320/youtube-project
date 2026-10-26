
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

import Download from "../Modals/Download.js";
import DownloadUsage from "../Modals/DownloadUsage.js";
import User from "../Modals/Auth.js";
import Video from "../Modals/video.js";

const DAILY_LIMITS = {
    free: 1,
    bronze: 5,
    silver: 15,
    gold: 30,
};

function getIndiaDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

// DOWNLOAD VIDEO
export const downloadVideo = async (req, res) => {
    try {
        const { videoId, userId } = req.body;

        if (
            !mongoose.isValidObjectId(videoId) ||
            !mongoose.isValidObjectId(userId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid video ID and user ID are required.",
            });
        }

        const [user, video] = await Promise.all([
            User.findById(userId),
            Video.findById(videoId),
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found.",
            });
        }

        if (!video.filepath) {
            return res.status(404).json({
                success: false,
                message: "Video file path is missing.",
            });
        }

        const filePath = path.resolve(video.filepath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "Video file does not exist on the server.",
            });
        }

        let plan = String(user.plan || "free").toLowerCase();

        if (!Object.hasOwn(DAILY_LIMITS, plan)) {
            plan = "free";
        }

        if (
            plan !== "free" &&
            user.planExpiresAt &&
            new Date(user.planExpiresAt) <= new Date()
        ) {
            plan = "free";
        }
        const dailyLimit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;
        const date = getIndiaDate();

        // Atomically reserve one download slot, preventing concurrent
        // requests from exceeding the configured limit.
        const usage = await DownloadUsage.findOneAndUpdate(
            {
                userId,
                date,
                count: { $lt: dailyLimit },
            },
            {
                $inc: { count: 1 },
                $setOnInsert: { userId, date },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            }
        ).catch(async (error) => {
            // If a concurrent request creates today's record first,
            // retry the conditional update against that existing record.
            if (error?.code === 11000) {
                return DownloadUsage.findOneAndUpdate(
                    {
                        userId,
                        date,
                        count: { $lt: dailyLimit },
                    },
                    { $inc: { count: 1 } },
                    { new: true }
                );
            }
            throw error;
        });

        if (!usage) {
            const current = await DownloadUsage.findOne({ userId, date });
            const downloadsToday = current?.count ?? 0;

            return res.status(429).json({
                success: false,
                message: `Daily download limit reached for your ${plan} plan. Try again tomorrow.`,
                plan,
                dailyLimit,
                downloadsToday,
                remainingDownloads: 0,
            });
        }

        const extension =
            path.extname(video.filename || filePath) || ".mp4";

        const safeTitle = (video.videotitle || "video").replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            "_"
        );

        const downloadName = `${safeTitle}${extension}`;

        // Keep the existing download-history feature.
        try {
            await Download.create({ userId, videoId });
        } catch (error) {
            // Release the reserved slot if history could not be recorded.
            await DownloadUsage.updateOne(
                { _id: usage._id, count: { $gt: 0 } },
                { $inc: { count: -1 } }
            );
            throw error;
        }

        return res.download(filePath, downloadName, async (error) => {
            if (error) {
                console.error("Download transfer error:", error);

                // Do not reduce the count after a transfer error: the response
                // may already have started, and a retry could otherwise bypass
                // the limit. Check server logs if a transfer fails.
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: "Unable to download video.",
                    });
                }
            }
        });
    } catch (error) {
        console.error("Download controller error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Something went wrong.",
            });
        }
    }
};

// GET USER DOWNLOAD HISTORY
export const getDownloadHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "A valid user ID is required.",
            });
        }

        const downloads = await Download.find({ userId })
            .populate("videoId")
            .sort({ downloadedAt: -1 });

        const history = downloads.filter((item) => item.videoId);

        return res.status(200).json({
            success: true,
            downloads: history,
        });
    } catch (error) {
        console.error("Get download history error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch download history.",
        });
    }
};

// REMOVE ONE DOWNLOAD HISTORY ENTRY
export const removeDownloadHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (
            !mongoose.isValidObjectId(id) ||
            !mongoose.isValidObjectId(userId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid download ID and user ID are required.",
            });
        }

        const deleted = await Download.findOneAndDelete({
            _id: id,
            userId,
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Download history entry not found.",
            });
        }

        // Deliberately retain DownloadUsage so deleting history
        // never restores the user's daily download allowance.
        return res.status(200).json({
            success: true,
            message: "Download removed from history.",
        });
    } catch (error) {
        console.error("Remove download history error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to remove download history.",
        });
    }
};