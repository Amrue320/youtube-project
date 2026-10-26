
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
    MoreVertical,
    X,
    Download,
    Play,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";

interface DownloadRecord {
    _id: string;
    videoId: {
        _id: string;
        videotitle?: string;
        filepath?: string;
        filename?: string;
        videochanel?: string;
        views?: number;
    } | null;
    downloadedAt?: string;
    createdAt?: string;
}

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getVideoUrl(filepath?: string) {
    if (!filepath) return "";

    if (/^https?:\/\//i.test(filepath)) {
        return filepath;
    }

    const normalizedPath = filepath.replace(/\\/g, "/").replace(/^\/+/, "");

    return `${API_BASE_URL.replace(/\/+$/, "")}/${normalizedPath}`;
}

function formatDownloadDate(date?: string) {
    if (!date) return "Download date unavailable";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "Download date unavailable";
    }

    return `Downloaded ${formatDistanceToNow(parsed, {
        addSuffix: true,
    })}`;
}

export default function DownloadsContent() {
    const { user } = useUser();

    const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [clearing, setClearing] = useState(false);

    const loadDownloads = useCallback(async () => {
        if (!user?._id) {
            setDownloads([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await axiosInstance.get(
                `/download/history/${user._id}`
            );

            setDownloads(
                Array.isArray(response.data?.downloads)
                    ? response.data.downloads
                    : []
            );
        } catch (error) {
            console.error("Load downloads error:", error);
            toast.error("Failed to load download history.");
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        void loadDownloads();
    }, [loadDownloads]);

    const removeDownload = async (downloadId: string) => {
        if (!user?._id || removingId || clearing) return;

        try {
            setRemovingId(downloadId);

            await axiosInstance.delete(`/download/history/${downloadId}`, {
                data: { userId: user._id },
            });

            setDownloads((previous) =>
                previous.filter((item) => item._id !== downloadId)
            );

            toast.success("Removed from download history.");
        } catch (error: any) {
            console.error("Remove download error:", error);
            toast.error(
                error?.response?.data?.message ||
                "Failed to remove download history."
            );
        } finally {
            setRemovingId(null);
        }
    };

    const clearHistory = async () => {
        if (!user?._id || downloads.length === 0 || clearing || removingId) {
            return;
        }

        const confirmed = window.confirm(
            "Remove all entries from your download history?"
        );

        if (!confirmed) return;

        try {
            setClearing(true);

            // Use the existing endpoint; daily usage records remain separate.
            const results = await Promise.allSettled(
                downloads.map((item) =>
                    axiosInstance.delete(`/download/history/${item._id}`, {
                        data: { userId: user._id },
                    })
                )
            );

            const failedIds = new Set(
                results.flatMap((result, index) =>
                    result.status === "rejected" ? [downloads[index]._id] : []
                )
            );

            setDownloads((previous) =>
                previous.filter((item) => failedIds.has(item._id))
            );

            if (failedIds.size === 0) {
                toast.success("Download history cleared.");
            } else {
                toast.error(
                    "Some entries could not be removed. Refresh to check your history."
                );
            }
        } catch (error) {
            console.error("Clear downloads error:", error);
            toast.error("Unable to clear download history.");
            await loadDownloads();
        } finally {
            setClearing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <RefreshCw className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading downloads...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="py-16 text-center">
                <Download className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                <h2 className="mb-2 text-xl font-semibold">
                    Sign in to view downloads
                </h2>
                <p className="text-muted-foreground">
                    Your download history is available after signing in.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <p className="text-sm text-muted-foreground">
                    {downloads.length}{" "}
                    {downloads.length === 1 ? "download" : "downloads"}
                </p>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void loadDownloads()}
                        disabled={loading || clearing || Boolean(removingId)}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void clearHistory()}
                        disabled={
                            downloads.length === 0 || clearing || Boolean(removingId)
                        }
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {clearing ? "Clearing..." : "Clear History"}
                    </Button>
                </div>
            </div>

            {downloads.length === 0 ? (
                <div className="py-16 text-center">
                    <Download className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                    <h2 className="mb-2 text-xl font-semibold">No downloads yet</h2>
                    <p className="mb-6 text-muted-foreground">
                        Videos you download will appear here.
                    </p>
                    <Link href="/">
                        <Button>
                            <Play className="mr-2 h-4 w-4" />
                            Browse Videos
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {downloads.map((item) => {
                        const video = item.videoId;

                        if (!video?._id) return null;

                        const videoUrl = getVideoUrl(video.filepath);

                        return (
                            <div
                                key={item._id}
                                className="group flex flex-col gap-4 rounded-lg p-2 transition-colors hover:bg-muted/50 sm:flex-row"
                            >
                                <Link
                                    href={`/watch/${video._id}`}
                                    className="w-full flex-shrink-0 sm:w-48"
                                >
                                    <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                        {videoUrl ? (
                                            <video
                                                src={videoUrl}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                muted
                                                preload="metadata"
                                                aria-label={video.videotitle || "Downloaded video"}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <Play className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                                            <div className="rounded-full bg-black/70 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Play className="h-5 w-5 fill-white text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>

                                <div className="min-w-0 flex-1">
                                    <Link href={`/watch/${video._id}`}>
                                        <h3 className="line-clamp-2 text-base font-semibold transition-colors hover:text-primary">
                                            {video.videotitle || "Untitled Video"}
                                        </h3>
                                    </Link>

                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {video.videochanel || "Unknown Channel"}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {(video.views || 0).toLocaleString()} views
                                    </p>

                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {formatDownloadDate(item.downloadedAt || item.createdAt)}
                                    </p>
                                </div>

                                <div className="flex-shrink-0">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={removingId === item._id || clearing}
                                                aria-label="Download history options"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => void removeDownload(item._id)}
                                            >
                                                <X className="mr-2 h-4 w-4" />
                                                Remove from history
                                            </DropdownMenuItem>

                                            <DropdownMenuItem asChild>
                                                <Link href={`/watch/${video._id}`}>
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Watch video
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}