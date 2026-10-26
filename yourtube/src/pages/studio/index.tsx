"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
    Eye,
    Heart,
    Users,
    Video,
    TrendingUp,
    Play,
    ArrowLeft,
    BarChart3,
    RefreshCw,
} from "lucide-react";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface VideoPerformance {
    _id: string;
    title: string;
    views: number;
    likes: number;
    category?: string;
    createdAt?: string;
    filepath?: string;
}

interface Analytics {
    totalVideos: number;
    totalViews: number;
    totalLikes: number;
    totalSubscribers: number;
}

interface AnalyticsResponse {
    success: boolean;

    creator: {
        name: string;
        channelname: string;
    };

    analytics: Analytics;

    videoPerformance: VideoPerformance[];
}

const StudioPage = () => {
    const router = useRouter();

    const { user } = useUser();

    const [data, setData] =
        useState<AnalyticsResponse | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    // ==========================================
    // FETCH ANALYTICS
    // ==========================================

    const fetchAnalytics = async () => {
        if (!user?._id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            setError("");

            console.log(
                "Logged-in user:",
                user
            );

            console.log(
                "Analytics user ID:",
                user._id
            );

            const response =
                await axiosInstance.get(
                    `/video/analytics/${user._id}`
                );

            console.log(
                "Analytics response:",
                response.data
            );

            if (!response.data?.success) {
                throw new Error(
                    "Analytics request was unsuccessful."
                );
            }

            setData(response.data);

        } catch (error: any) {

            console.error(
                "Analytics fetch error:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "Unable to load creator analytics."
            );

            setData(null);

        } finally {

            setLoading(false);

        }
    };

    // ==========================================
    // FETCH WHEN USER CHANGES
    // ==========================================

    useEffect(() => {

        fetchAnalytics();

    }, [user?._id]);

    // ==========================================
    // NOT SIGNED IN
    // ==========================================

    if (!user) {

        return (

            <div className="min-h-screen flex items-center justify-center px-4">

                <div className="text-center">

                    <BarChart3
                        size={60}
                        className="mx-auto mb-4 text-muted-foreground"
                    />

                    <h1 className="text-2xl font-bold mb-2">
                        Creator Studio
                    </h1>

                    <p className="text-muted-foreground">
                        Please sign in to view your analytics.
                    </p>

                </div>

            </div>

        );

    }

    // ==========================================
    // LOADING
    // ==========================================

    if (loading) {

        return (

            <div className="min-h-screen flex items-center justify-center px-4">

                <div className="text-center">

                    <RefreshCw
                        size={40}
                        className="mx-auto mb-4 animate-spin"
                    />

                    <p className="text-muted-foreground">
                        Loading creator analytics...
                    </p>

                </div>

            </div>

        );

    }

    // ==========================================
    // ERROR
    // ==========================================

    if (error) {

        return (

            <div className="min-h-screen flex items-center justify-center px-4">

                <div className="text-center max-w-md">

                    <BarChart3
                        size={55}
                        className="mx-auto mb-4 text-muted-foreground"
                    />

                    <h1 className="text-xl font-semibold mb-2">
                        Unable to load analytics
                    </h1>

                    <p className="text-muted-foreground mb-2">
                        {error}
                    </p>

                    <p className="text-xs text-muted-foreground mb-5 break-all">
                        User ID: {user?._id || "Missing"}
                    </p>

                    <button
                        onClick={fetchAnalytics}
                        className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition"
                    >
                        Try Again
                    </button>

                </div>

            </div>

        );

    }

    // ==========================================
    // NO DATA
    // ==========================================

    if (!data) {

        return (

            <div className="min-h-screen flex items-center justify-center">

                <p className="text-muted-foreground">
                    No analytics data available.
                </p>

            </div>

        );

    }

    // ==========================================
    // ANALYTICS DATA
    // ==========================================

    const {
        totalVideos,
        totalViews,
        totalLikes,
        totalSubscribers,
    } = data.analytics;

    // ==========================================
    // TOP VIDEOS
    // ==========================================

    const topVideos =
        data.videoPerformance.slice(0, 5);

    // ==========================================
    // CHART DATA
    // ==========================================

    const chartData =
        data.videoPerformance
            .slice(0, 7)
            .map((currentVideo, index) => ({
                name: `Video ${index + 1}`,
                views: currentVideo.views,
                likes: currentVideo.likes,
            }));

    return (

        <div className="min-h-screen bg-background text-foreground px-6 py-8">

            <div className="max-w-7xl mx-auto">

                {/* =====================================
            HEADER
        ====================================== */}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

                    <div>

                        <div className="flex items-center gap-3 mb-2">

                            <BarChart3 size={32} />

                            <h1 className="text-3xl font-bold">
                                Creator Studio
                            </h1>

                        </div>

                        <p className="text-muted-foreground">

                            {data.creator.channelname}

                            {" • "}

                            Channel Analytics

                        </p>

                    </div>

                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center justify-center gap-2 border border-border px-4 py-2 rounded-lg hover:bg-accent transition"
                    >

                        <ArrowLeft size={18} />

                        Back to YouTube

                    </button>

                </div>

                {/* =====================================
            STAT CARDS
        ====================================== */}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

                    {/* TOTAL VIEWS */}

                    <div className="border border-border rounded-xl p-5 bg-background hover:shadow-md transition">

                        <div className="flex items-center justify-between mb-4">

                            <div className="p-3 rounded-lg bg-accent">

                                <Eye size={24} />

                            </div>

                            <TrendingUp
                                size={20}
                                className="text-green-500"
                            />

                        </div>

                        <p className="text-sm text-muted-foreground">
                            Total Views
                        </p>

                        <h2 className="text-3xl font-bold mt-1">

                            {totalViews.toLocaleString()}

                        </h2>

                    </div>

                    {/* SUBSCRIBERS */}

                    <div className="border border-border rounded-xl p-5 bg-background hover:shadow-md transition">

                        <div className="flex items-center justify-between mb-4">

                            <div className="p-3 rounded-lg bg-accent">

                                <Users size={24} />

                            </div>

                        </div>

                        <p className="text-sm text-muted-foreground">
                            Subscribers
                        </p>

                        <h2 className="text-3xl font-bold mt-1">

                            {totalSubscribers.toLocaleString()}

                        </h2>

                    </div>

                    {/* TOTAL VIDEOS */}

                    <div className="border border-border rounded-xl p-5 bg-background hover:shadow-md transition">

                        <div className="flex items-center justify-between mb-4">

                            <div className="p-3 rounded-lg bg-accent">

                                <Video size={24} />

                            </div>

                        </div>

                        <p className="text-sm text-muted-foreground">
                            Total Videos
                        </p>

                        <h2 className="text-3xl font-bold mt-1">

                            {totalVideos.toLocaleString()}

                        </h2>

                    </div>

                    {/* TOTAL LIKES */}

                    <div className="border border-border rounded-xl p-5 bg-background hover:shadow-md transition">

                        <div className="flex items-center justify-between mb-4">

                            <div className="p-3 rounded-lg bg-accent">

                                <Heart size={24} />

                            </div>

                        </div>

                        <p className="text-sm text-muted-foreground">
                            Total Likes
                        </p>

                        <h2 className="text-3xl font-bold mt-1">

                            {totalLikes.toLocaleString()}

                        </h2>

                    </div>

                </div>

                {/* =====================================
            TOP PERFORMING VIDEOS
        ====================================== */}

                <div className="border border-border rounded-xl overflow-hidden">

                    <div className="p-6 border-b border-border">

                        <h2 className="text-xl font-bold">
                            Top Performing Videos
                        </h2>

                        <p className="text-sm text-muted-foreground mt-1">
                            Your videos ranked by total views
                        </p>

                    </div>

                    {topVideos.length === 0 ? (

                        <div className="py-16 text-center">

                            <Video
                                size={50}
                                className="mx-auto mb-4 text-muted-foreground"
                            />

                            <h3 className="font-semibold text-lg">
                                No videos yet
                            </h3>

                            <p className="text-muted-foreground mt-1">
                                Upload videos to start seeing analytics.
                            </p>

                        </div>

                    ) : (

                        <div className="divide-y divide-border">

                            {topVideos.map(
                                (currentVideo, index) => (

                                    <div
                                        key={currentVideo._id}
                                        className="flex items-center gap-4 p-5 hover:bg-accent/50 transition"
                                    >

                                        {/* RANK */}

                                        <div className="w-8 text-center">

                                            <span className="font-bold text-lg">
                                                #{index + 1}
                                            </span>

                                        </div>

                                        {/* VIDEO PREVIEW */}

                                        <div className="h-16 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">

                                            <Play
                                                size={24}
                                                className="text-muted-foreground"
                                            />

                                        </div>

                                        {/* TITLE */}

                                        <div className="flex-1 min-w-0">

                                            <h3 className="font-semibold truncate">

                                                {currentVideo.title}

                                            </h3>

                                            <p className="text-sm text-muted-foreground mt-1">

                                                {currentVideo.category ||
                                                    "All"}

                                            </p>

                                        </div>

                                        {/* VIEWS */}

                                        <div className="hidden sm:flex items-center gap-2 min-w-[100px]">

                                            <Eye size={17} />

                                            <span className="font-medium">

                                                {currentVideo.views.toLocaleString()}

                                            </span>

                                        </div>

                                        {/* LIKES */}

                                        <div className="hidden md:flex items-center gap-2 min-w-[90px]">

                                            <Heart size={17} />

                                            <span className="font-medium">

                                                {currentVideo.likes.toLocaleString()}

                                            </span>

                                        </div>

                                        {/* WATCH VIDEO */}

                                        <button
                                            onClick={() =>
                                                router.push(
                                                    `/watch/${currentVideo._id}`
                                                )
                                            }
                                            className="p-2 rounded-lg hover:bg-accent transition"
                                            title="Watch video"
                                        >

                                            <Play size={20} />

                                        </button>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </div>

                {/* =====================================
            ANALYTICS CHART
        ====================================== */}

                <div className="border border-border rounded-xl p-6 mt-8 bg-background">

                    <div className="mb-6">

                        <div className="flex items-center gap-3">

                            <BarChart3 size={24} />

                            <h2 className="text-xl font-bold">
                                Video Performance Analytics
                            </h2>

                        </div>

                        <p className="text-sm text-muted-foreground mt-1">
                            Compare views and likes across your videos
                        </p>

                    </div>

                    {chartData.length === 0 ? (

                        <div className="h-[350px] flex items-center justify-center">

                            <p className="text-muted-foreground">
                                Upload videos to view performance analytics.
                            </p>

                        </div>

                    ) : (

                        <div className="w-full h-[350px]">

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <BarChart
                                    data={chartData}
                                    margin={{
                                        top: 10,
                                        right: 20,
                                        left: 0,
                                        bottom: 10,
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="name"
                                    />

                                    <YAxis />

                                    <Tooltip />

                                    <Legend />

                                    <Bar
                                        dataKey="views"
                                        name="Views"
                                        fill="#ef4444"
                                        radius={[5, 5, 0, 0]}
                                    />

                                    <Bar
                                        dataKey="likes"
                                        name="Likes"
                                        fill="#3b82f6"
                                        radius={[5, 5, 0, 0]}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        </div>

                    )}

                </div>

            </div>

        </div>

    );
};

export default StudioPage;