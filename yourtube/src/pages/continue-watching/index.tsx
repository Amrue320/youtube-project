"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
    Play,
    Trash2,
    Clock,
    X,
} from "lucide-react";

import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface ProgressVideo {
    _id: string;

    userId: string;

    videoId: {
        _id: string;
        videotitle: string;
        videochanel?: string;
        filepath: string;
        filename?: string;
        views?: number;
        Like?: number;
        category?: string;
        createdAt?: string;
    };

    watchedSeconds: number;
    duration: number;
    completed: boolean;
    lastWatchedAt: string;
}

const ContinueWatchingPage = () => {
    const router = useRouter();

    const { user } = useUser();

    const [videos, setVideos] =
        useState<ProgressVideo[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    // ==========================================
    // FETCH CONTINUE WATCHING
    // ==========================================

    const fetchContinueWatching = async () => {
        if (!user?._id) {
            setVideos([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response =
                await axiosInstance.get(
                    `/progress/continue/${user._id}`
                );

            setVideos(
                response.data?.videos || []
            );

        } catch (error) {
            console.error(
                "Continue Watching error:",
                error
            );

            setError(
                "Unable to load Continue Watching."
            );

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContinueWatching();
    }, [user?._id]);

    // ==========================================
    // REMOVE ONE VIDEO
    // ==========================================

    const removeVideo = async (
        e: React.MouseEvent,
        videoId: string
    ) => {
        e.stopPropagation();

        if (!user?._id) return;

        try {
            await axiosInstance.delete(
                `/progress/${user._id}/${videoId}`
            );

            setVideos((previous) =>
                previous.filter(
                    (item) =>
                        item.videoId?._id !== videoId
                )
            );

        } catch (error) {
            console.error(
                "Remove progress error:",
                error
            );

            alert(
                "Unable to remove video."
            );
        }
    };

    // ==========================================
    // CLEAR ALL
    // ==========================================

    const clearAll = async () => {
        if (!user?._id) return;

        const confirmed =
            window.confirm(
                "Clear all Continue Watching videos?"
            );

        if (!confirmed) return;

        try {
            await axiosInstance.delete(
                `/progress/continue/${user._id}`
            );

            setVideos([]);

        } catch (error) {
            console.error(
                "Clear Continue Watching error:",
                error
            );

            alert(
                "Unable to clear Continue Watching."
            );
        }
    };

    // ==========================================
    // FORMAT TIME
    // ==========================================

    const formatTime = (
        seconds: number
    ) => {
        if (
            !seconds ||
            !Number.isFinite(seconds)
        ) {
            return "0:00";
        }

        const hours =
            Math.floor(seconds / 3600);

        const minutes =
            Math.floor(
                (seconds % 3600) / 60
            );

        const remainingSeconds =
            Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes
                .toString()
                .padStart(2, "0")}:${remainingSeconds
                    .toString()
                    .padStart(2, "0")}`;
        }

        return `${minutes}:${remainingSeconds
            .toString()
            .padStart(2, "0")}`;
    };

    // ==========================================
    // CALCULATE PROGRESS
    // ==========================================

    const getProgressPercentage = (
        watchedSeconds: number,
        duration: number
    ) => {
        if (
            !duration ||
            duration <= 0
        ) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(
                0,
                (watchedSeconds / duration) *
                100
            )
        );
    };

    // ==========================================
    // NOT SIGNED IN
    // ==========================================

    if (!user) {
        return (
            <main className="min-h-screen px-6 py-8">

                <div className="max-w-6xl mx-auto text-center py-20">

                    <Clock
                        size={60}
                        className="mx-auto mb-5 text-muted-foreground"
                    />

                    <h1 className="text-2xl font-bold mb-2">
                        Continue Watching
                    </h1>

                    <p className="text-muted-foreground">
                        Sign in to continue watching your videos.
                    </p>

                </div>

            </main>
        );
    }

    // ==========================================
    // LOADING
    // ==========================================

    if (loading) {
        return (
            <main className="min-h-screen px-6 py-8">

                <div className="max-w-6xl mx-auto text-center py-20">

                    <p className="text-muted-foreground">
                        Loading Continue Watching...
                    </p>

                </div>

            </main>
        );
    }

    return (
        <main className="min-h-screen px-6 py-8 bg-background text-foreground">

            <div className="max-w-6xl mx-auto">

                {/* =====================================
            HEADER
        ====================================== */}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

                    <div>

                        <div className="flex items-center gap-3">

                            <Clock size={30} />

                            <h1 className="text-3xl font-bold">
                                Continue Watching
                            </h1>

                        </div>

                        <p className="text-muted-foreground mt-2">
                            Pick up where you left off.
                        </p>

                    </div>

                    {videos.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="flex items-center justify-center gap-2 border border-border px-4 py-2 rounded-lg hover:bg-accent transition"
                        >
                            <Trash2 size={18} />

                            Clear All
                        </button>
                    )}

                </div>

                {/* =====================================
            ERROR
        ====================================== */}

                {error && (

                    <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-5 mb-6">

                        <p className="text-red-500">
                            {error}
                        </p>

                        <button
                            onClick={fetchContinueWatching}
                            className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                        >
                            Try Again
                        </button>

                    </div>

                )}

                {/* =====================================
            EMPTY STATE
        ====================================== */}

                {!error &&
                    videos.length === 0 && (

                        <div className="border border-border rounded-xl py-20 text-center">

                            <Play
                                size={60}
                                className="mx-auto mb-5 text-muted-foreground"
                            />

                            <h2 className="text-xl font-semibold mb-2">
                                Nothing to continue
                            </h2>

                            <p className="text-muted-foreground mb-6">
                                Videos you start watching will appear here.
                            </p>

                            <button
                                onClick={() =>
                                    router.push("/")
                                }
                                className="bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition"
                            >
                                Browse Videos
                            </button>

                        </div>

                    )}

                {/* =====================================
            VIDEO LIST
        ====================================== */}

                {videos.length > 0 && (

                    <div className="space-y-5">

                        {videos.map((item) => {

                            const currentVideo =
                                item.videoId;

                            if (!currentVideo) {
                                return null;
                            }

                            const progress =
                                getProgressPercentage(
                                    item.watchedSeconds,
                                    item.duration
                                );

                            const videoUrl =
                                currentVideo.filepath
                                    ? `http://localhost:5000/${currentVideo.filepath.replace(
                                        /\\/g,
                                        "/"
                                    )}`
                                    : "";

                            return (

                                <div
                                    key={item._id}
                                    onClick={() =>
                                        router.push(
                                            `/watch/${currentVideo._id}`
                                        )
                                    }
                                    className="group border border-border rounded-xl p-4 cursor-pointer hover:shadow-lg hover:border-red-500 transition"
                                >

                                    <div className="flex flex-col sm:flex-row gap-5">

                                        {/* VIDEO PREVIEW */}

                                        <div className="relative w-full sm:w-64 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">

                                            <video
                                                src={videoUrl}
                                                className="w-full h-full object-cover"
                                                muted
                                                preload="metadata"
                                            />

                                            {/* PLAY BUTTON */}

                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">

                                                <div className="bg-black/70 text-white rounded-full p-4">

                                                    <Play
                                                        size={24}
                                                        fill="currentColor"
                                                    />

                                                </div>

                                            </div>

                                            {/* PROGRESS BAR */}

                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">

                                                <div
                                                    className="h-full bg-red-600"
                                                    style={{
                                                        width: `${progress}%`,
                                                    }}
                                                />

                                            </div>

                                        </div>

                                        {/* VIDEO INFORMATION */}

                                        <div className="flex-1 min-w-0">

                                            <div className="flex justify-between gap-4">

                                                <div className="min-w-0">

                                                    <h2 className="text-lg font-semibold line-clamp-2">

                                                        {currentVideo.videotitle ||
                                                            "Untitled Video"}

                                                    </h2>

                                                    <p className="text-sm text-muted-foreground mt-2">

                                                        {currentVideo.videochanel ||
                                                            "Unknown Channel"}

                                                    </p>

                                                </div>

                                                {/* REMOVE */}

                                                <button
                                                    onClick={(e) =>
                                                        removeVideo(
                                                            e,
                                                            currentVideo._id
                                                        )
                                                    }
                                                    className="p-2 rounded-full hover:bg-accent shrink-0"
                                                    title="Remove from Continue Watching"
                                                >
                                                    <X size={20} />
                                                </button>

                                            </div>

                                            {/* VIEWS */}

                                            <p className="text-sm text-muted-foreground mt-2">

                                                {(currentVideo.views || 0).toLocaleString()}{" "}
                                                views

                                            </p>

                                            {/* PROGRESS */}

                                            <div className="mt-5">

                                                <div className="flex justify-between text-xs text-muted-foreground mb-2">

                                                    <span>
                                                        {formatTime(
                                                            item.watchedSeconds
                                                        )}
                                                    </span>

                                                    <span>
                                                        {formatTime(
                                                            item.duration
                                                        )}
                                                    </span>

                                                </div>

                                                <div className="h-2 rounded-full bg-muted overflow-hidden">

                                                    <div
                                                        className="h-full bg-red-600 transition-all"
                                                        style={{
                                                            width: `${progress}%`,
                                                        }}
                                                    />

                                                </div>

                                            </div>

                                            {/* CONTINUE BUTTON */}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();

                                                    router.push(
                                                        `/watch/${currentVideo._id}`
                                                    );
                                                }}
                                                className="mt-5 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                                            >

                                                <Play
                                                    size={17}
                                                    fill="currentColor"
                                                />

                                                Continue Watching

                                            </button>

                                        </div>

                                    </div>

                                </div>

                            );
                        })}

                    </div>

                )}

            </div>

        </main>
    );
};

export default ContinueWatchingPage;