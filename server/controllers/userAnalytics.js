import mongoose from "mongoose";

import history from "../Modals/history.js";
import VideoProgress from "../Modals/videoProgress.js";

export const getUserAnalytics = async (req, res) => {
    const { userId } = req.params;

    try {
        // Validate user ID
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        // --------------------------------------------------
        // 1. Get user's watch history
        // --------------------------------------------------

        const historyData = await history
            .find({ viewer: userId })
            .populate({
                path: "videoid",
                model: "videofiles",
            })
            .sort({ createdAt: -1 })
            .lean();

        // --------------------------------------------------
        // 2. Get user's video progress
        // --------------------------------------------------

        const progressData = await VideoProgress.find({
            userId,
        })
            .populate({
                path: "videoId",
                model: "videofiles",
            })
            .lean();

        // --------------------------------------------------
        // 3. Total videos watched
        // --------------------------------------------------

        const totalVideosWatched = historyData.length;

        // Unique videos watched
        const uniqueVideoIds = new Set(
            historyData
                .map((item) => item.videoid?._id?.toString())
                .filter(Boolean)
        );

        const uniqueVideosWatched = uniqueVideoIds.size;

        // --------------------------------------------------
        // 4. Total watch time
        // --------------------------------------------------

        const totalWatchTime = progressData.reduce(
            (total, item) => {
                return total + (Number(item.watchedSeconds) || 0);
            },
            0
        );

        // --------------------------------------------------
        // 5. Completed videos
        // --------------------------------------------------

        const completedVideos = progressData.filter(
            (item) => item.completed === true
        ).length;

        // --------------------------------------------------
        // 6. Most watched category
        // --------------------------------------------------

        const categoryCounts = {};

        historyData.forEach((item) => {
            const category = item.videoid?.category;

            if (!category || category === "All") {
                return;
            }

            categoryCounts[category] =
                (categoryCounts[category] || 0) + 1;
        });

        let mostWatchedCategory = "None";

        let highestCategoryCount = 0;

        Object.entries(categoryCounts).forEach(
            ([category, count]) => {
                if (count > highestCategoryCount) {
                    highestCategoryCount = count;
                    mostWatchedCategory = category;
                }
            }
        );

        // --------------------------------------------------
        // 7. Most watched channel
        // --------------------------------------------------

        const channelCounts = {};

        historyData.forEach((item) => {
            const channel = item.videoid?.videochanel;

            if (!channel) {
                return;
            }

            channelCounts[channel] =
                (channelCounts[channel] || 0) + 1;
        });

        let mostWatchedChannel = "None";

        let highestChannelCount = 0;

        Object.entries(channelCounts).forEach(
            ([channel, count]) => {
                if (count > highestChannelCount) {
                    highestChannelCount = count;
                    mostWatchedChannel = channel;
                }
            }
        );

        // --------------------------------------------------
        // 8. Daily watch activity
        // --------------------------------------------------

        const dailyActivityMap = {};

        historyData.forEach((item) => {
            const dateValue = item.createdAt || item.likedon;

            if (!dateValue) {
                return;
            }

            const date = new Date(dateValue);

            if (Number.isNaN(date.getTime())) {
                return;
            }

            const dateKey = date.toISOString().split("T")[0];

            if (!dailyActivityMap[dateKey]) {
                dailyActivityMap[dateKey] = {
                    date: dateKey,
                    videos: 0,
                    watchTime: 0,
                };
            }

            dailyActivityMap[dateKey].videos += 1;
        });

        // Add watch time to daily activity
        progressData.forEach((item) => {
            const dateValue =
                item.lastWatchedAt || item.updatedAt;

            if (!dateValue) {
                return;
            }

            const date = new Date(dateValue);

            if (Number.isNaN(date.getTime())) {
                return;
            }

            const dateKey = date.toISOString().split("T")[0];

            if (!dailyActivityMap[dateKey]) {
                dailyActivityMap[dateKey] = {
                    date: dateKey,
                    videos: 0,
                    watchTime: 0,
                };
            }

            dailyActivityMap[dateKey].watchTime +=
                Number(item.watchedSeconds) || 0;
        });

        const dailyActivity = Object.values(
            dailyActivityMap
        )
            .sort((a, b) =>
                a.date.localeCompare(b.date)
            )
            .slice(-7);

        // --------------------------------------------------
        // 9. Calculate current watch streak
        // --------------------------------------------------

        const watchedDates = new Set(
            historyData
                .map((item) => {
                    const dateValue =
                        item.createdAt || item.likedon;

                    if (!dateValue) return null;

                    const date = new Date(dateValue);

                    if (Number.isNaN(date.getTime())) {
                        return null;
                    }

                    return date.toISOString().split("T")[0];
                })
                .filter(Boolean)
        );

        let currentStreak = 0;

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        // Check today first
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);

            checkDate.setDate(
                today.getDate() - i
            );

            const dateKey = checkDate
                .toISOString()
                .split("T")[0];

            if (watchedDates.has(dateKey)) {
                currentStreak++;
            } else {
                break;
            }
        }

        // --------------------------------------------------
        // 10. Longest viewing session
        // --------------------------------------------------

        let longestSession = 0;

        progressData.forEach((item) => {
            const watchedSeconds =
                Number(item.watchedSeconds) || 0;

            if (watchedSeconds > longestSession) {
                longestSession = watchedSeconds;
            }
        });

        // --------------------------------------------------
        // 11. Return analytics
        // --------------------------------------------------

        return res.status(200).json({
            success: true,

            analytics: {
                totalVideosWatched,
                uniqueVideosWatched,

                totalWatchTime,

                completedVideos,

                currentStreak,

                longestSession,

                mostWatchedCategory,

                mostWatchedChannel,

                dailyActivity,
            },
        });
    } catch (error) {
        console.error(
            "User analytics error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to calculate user analytics",
        });
    }
};