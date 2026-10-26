"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
    Flame,
    Clock,
    PlayCircle,
    CheckCircle,
    Trophy,
    BarChart3,
    RefreshCw,
} from "lucide-react";

import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

interface DailyActivity {
    date: string;
    videos: number;
    watchTime: number;
}

interface Analytics {
    totalVideosWatched: number;
    uniqueVideosWatched: number;
    totalWatchTime: number;
    completedVideos: number;
    currentStreak: number;
    longestSession: number;
    mostWatchedCategory: string;
    mostWatchedChannel: string;
    dailyActivity: DailyActivity[];
}

const formatWatchTime = (seconds: number) => {
    if (!seconds || seconds <= 0) {
        return "0m";
    }

    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor(
        (seconds % 3600) / 60
    );

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
};

const formatSession = (seconds: number) => {
    if (!seconds || seconds <= 0) {
        return "0m";
    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = Math.floor(
        seconds % 60
    );

    if (minutes === 0) {
        return `${remainingSeconds}s`;
    }

    return `${minutes}m ${remainingSeconds}s`;
};

const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    return parsedDate.toLocaleDateString(
        "en-US",
        {
            weekday: "short",
        }
    );
};

export default function InsightsPage() {
    const router = useRouter();

    const { user } = useUser();

    const [analytics, setAnalytics] =
        useState<Analytics | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const fetchAnalytics = async () => {
        if (!user?._id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response =
                await axiosInstance.get(
                    `/analytics/user/${user._id}`
                );

            setAnalytics(
                response.data?.analytics || null
            );
        } catch (error) {
            console.error(
                "Analytics error:",
                error
            );

            setError(
                "Unable to load your viewing insights."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (router.isReady) {
            fetchAnalytics();
        }
    }, [router.isReady, user?._id]);

    if (!user) {
        return (
            <main className="flex-1 p-6">
                <div className="max-w-6xl mx-auto">

                    <div className="text-center py-20">

                        <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />

                        <h1 className="text-2xl font-bold mb-2">
                            Your Viewing Insights
                        </h1>

                        <p className="text-muted-foreground">
                            Sign in to see your personalized
                            viewing statistics.
                        </p>

                    </div>

                </div>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="flex-1 p-6">
                <div className="max-w-6xl mx-auto">

                    <div className="flex flex-col items-center justify-center py-20">

                        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mb-4" />

                        <p className="text-muted-foreground">
                            Loading your viewing insights...
                        </p>

                    </div>

                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex-1 p-6">
                <div className="max-w-6xl mx-auto">

                    <div className="text-center py-20">

                        <p className="text-red-500 mb-4">
                            {error}
                        </p>

                        <button
                            onClick={fetchAnalytics}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                        >
                            Try Again
                        </button>

                    </div>

                </div>
            </main>
        );
    }

    if (!analytics) {
        return (
            <main className="flex-1 p-6">
                <div className="max-w-6xl mx-auto">

                    <div className="text-center py-20">

                        <p className="text-muted-foreground">
                            No viewing data available yet.
                        </p>

                    </div>

                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 p-6">

            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">

                    <div>
                        <h1 className="text-3xl font-bold">
                            Your Viewing Insights
                        </h1>

                        <p className="text-muted-foreground mt-2">
                            Understand your YouTube watching
                            activity.
                        </p>
                    </div>

                    <button
                        onClick={fetchAnalytics}
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>

                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Watch Streak */}
                    <div className="rounded-xl border bg-card p-5">

                        <div className="flex items-center justify-between">

                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Watch Streak
                                </p>

                                <h2 className="text-3xl font-bold mt-2">
                                    {analytics.currentStreak}
                                </h2>

                                <p className="text-xs text-muted-foreground mt-1">
                                    consecutive days
                                </p>
                            </div>

                            <Flame className="w-8 h-8 text-orange-500" />

                        </div>

                    </div>

                    {/* Videos Watched */}
                    <div className="rounded-xl border bg-card p-5">

                        <div className="flex items-center justify-between">

                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Videos Watched
                                </p>

                                <h2 className="text-3xl font-bold mt-2">
                                    {analytics.uniqueVideosWatched}
                                </h2>

                                <p className="text-xs text-muted-foreground mt-1">
                                    unique videos
                                </p>
                            </div>

                            <PlayCircle className="w-8 h-8 text-blue-500" />

                        </div>

                    </div>

                    {/* Watch Time */}
                    <div className="rounded-xl border bg-card p-5">

                        <div className="flex items-center justify-between">

                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Watch Time
                                </p>

                                <h2 className="text-3xl font-bold mt-2">
                                    {formatWatchTime(
                                        analytics.totalWatchTime
                                    )}
                                </h2>

                                <p className="text-xs text-muted-foreground mt-1">
                                    total recorded time
                                </p>
                            </div>

                            <Clock className="w-8 h-8 text-green-500" />

                        </div>

                    </div>

                    {/* Completed */}
                    <div className="rounded-xl border bg-card p-5">

                        <div className="flex items-center justify-between">

                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Completed
                                </p>

                                <h2 className="text-3xl font-bold mt-2">
                                    {analytics.completedVideos}
                                </h2>

                                <p className="text-xs text-muted-foreground mt-1">
                                    finished videos
                                </p>
                            </div>

                            <CheckCircle className="w-8 h-8 text-purple-500" />

                        </div>

                    </div>

                </div>

                {/* Personal highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div className="rounded-xl border bg-card p-5">

                        <div className="flex items-center gap-3 mb-3">
                            <Trophy className="w-5 h-5" />

                            <h3 className="font-semibold">
                                Top Category
                            </h3>
                        </div>

                        <p className="text-xl font-bold">
                            {analytics.mostWatchedCategory}
                        </p>

                    </div>

                    <div className="rounded-xl border bg-card p-5">

                        <div className="flex items-center gap-3 mb-3">
                            <PlayCircle className="w-5 h-5" />

                            <h3 className="font-semibold">
                                Top Channel
                            </h3>
                        </div>

                        <p className="text-xl font-bold truncate">
                            {analytics.mostWatchedChannel}
                        </p>

                    </div>

                    <div className="rounded-xl border bg-card p-5">

                        <div className="flex items-center gap-3 mb-3">
                            <Clock className="w-5 h-5" />

                            <h3 className="font-semibold">
                                Longest Session
                            </h3>
                        </div>

                        <p className="text-xl font-bold">
                            {formatSession(
                                analytics.longestSession
                            )}
                        </p>

                    </div>

                </div>

                {/* Daily activity */}
                <div className="rounded-xl border bg-card p-6">

                    <div className="flex items-center gap-3 mb-6">

                        <BarChart3 className="w-6 h-6" />

                        <div>
                            <h2 className="text-xl font-semibold">
                                Recent Viewing Activity
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Your activity over the last 7 days
                            </p>
                        </div>

                    </div>

                    {analytics.dailyActivity.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No recent viewing activity.
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-3">

                            {analytics.dailyActivity.map(
                                (day) => (
                                    <div
                                        key={day.date}
                                        className="text-center"
                                    >

                                        <div className="h-40 flex items-end justify-center">

                                            <div
                                                className="w-full max-w-[45px] bg-primary rounded-t-md transition-all"
                                                style={{
                                                    height: `${Math.max(
                                                        12,
                                                        Math.min(
                                                            100,
                                                            day.videos * 20
                                                        )
                                                    )}%`,
                                                }}
                                                title={`${day.videos} videos`}
                                            />

                                        </div>

                                        <p className="text-xs font-medium mt-2">
                                            {formatDate(day.date)}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {day.videos}{" "}
                                            {day.videos === 1
                                                ? "video"
                                                : "videos"}
                                        </p>

                                    </div>
                                )
                            )}

                        </div>
                    )}

                </div>

            </div>

        </main>
    );
}