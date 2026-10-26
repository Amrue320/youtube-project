"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Trash2, ListVideo } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface Video {
    _id: string;
    videotitle?: string;
    videochanel?: string;
    filepath?: string;
    thumbnail?: string;
    views?: number;
}

interface Playlist {
    _id: string;
    name: string;
    description?: string;
    videos?: Video[];
    owner?: any;
}

const PlaylistPage = () => {
    const router = useRouter();
    const { user } = useUser();

    const { id } = router.query;

    const [playlist, setPlaylist] =
        useState<Playlist | null>(null);

    const [loading, setLoading] = useState(true);

    // ================= FETCH PLAYLIST =================

    const fetchPlaylist = async () => {
        if (!id) return;

        try {
            setLoading(true);

            const response = await axiosInstance.get(
                `/playlist/${id}`
            );

            setPlaylist(response.data.playlist);
        } catch (error) {
            console.error(
                "Error fetching playlist:",
                error
            );

            setPlaylist(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (router.isReady) {
            fetchPlaylist();
        }
    }, [router.isReady, id]);

    // ================= REMOVE VIDEO =================

    const removeVideo = async (
        videoId: string
    ) => {
        if (!id) return;

        const confirmed = window.confirm(
            "Remove this video from the playlist?"
        );

        if (!confirmed) return;

        try {
            await axiosInstance.delete(
                `/playlist/${id}/video/${videoId}`
            );

            setPlaylist((previous) => {
                if (!previous) return previous;

                return {
                    ...previous,
                    videos:
                        previous.videos?.filter(
                            (video) => video._id !== videoId
                        ) || [],
                };
            });
        } catch (error) {
            console.error(
                "Error removing video:",
                error
            );

            alert(
                "Could not remove video from playlist."
            );
        }
    };

    // ================= DELETE PLAYLIST =================

    const deletePlaylist = async () => {
        if (!id) return;

        const confirmed = window.confirm(
            "Are you sure you want to permanently delete this playlist?"
        );

        if (!confirmed) return;

        try {
            await axiosInstance.delete(
                `/playlist/${id}`
            );

            router.push("/playlists");
        } catch (error) {
            console.error(
                "Error deleting playlist:",
                error
            );

            alert("Could not delete playlist.");
        }
    };

    // ================= LOADING =================

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">
                    Loading playlist...
                </p>
            </div>
        );
    }

    // ================= NOT FOUND =================

    if (!playlist) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center">

                    <ListVideo
                        size={60}
                        className="mx-auto mb-4 text-muted-foreground"
                    />

                    <h1 className="text-2xl font-bold mb-2">
                        Playlist not found
                    </h1>

                    <p className="text-muted-foreground mb-5">
                        This playlist may have been deleted or
                        does not exist.
                    </p>

                    <button
                        onClick={() =>
                            router.push("/playlists")
                        }
                        className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700"
                    >
                        Back to Playlists
                    </button>

                </div>
            </div>
        );
    }

    // ================= PAGE =================

    return (
        <div className="min-h-screen px-6 py-8 bg-background text-foreground">

            <div className="max-w-6xl mx-auto">

                {/* BACK BUTTON */}

                <button
                    onClick={() =>
                        router.push("/playlists")
                    }
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
                >
                    <ArrowLeft size={20} />

                    Back to Playlists
                </button>

                {/* PLAYLIST HEADER */}

                <div className="border border-border rounded-xl p-6 mb-8">

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">

                        <div className="flex items-start gap-4">

                            <div className="p-4 rounded-xl bg-accent">
                                <ListVideo size={35} />
                            </div>

                            <div>

                                <h1 className="text-3xl font-bold">
                                    {playlist.name}
                                </h1>

                                <p className="text-muted-foreground mt-1">
                                    {playlist.videos?.length || 0} videos
                                </p>

                                {playlist.description && (
                                    <p className="text-muted-foreground mt-4 max-w-2xl">
                                        {playlist.description}
                                    </p>
                                )}

                            </div>

                        </div>

                        <button
                            onClick={deletePlaylist}
                            className="flex items-center justify-center gap-2 border border-red-500 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition"
                        >
                            <Trash2 size={18} />

                            Delete Playlist
                        </button>

                    </div>

                </div>

                {/* VIDEOS */}

                {!playlist.videos ||
                    playlist.videos.length === 0 ? (

                    <div className="border border-border rounded-xl py-20 text-center">

                        <ListVideo
                            size={60}
                            className="mx-auto mb-4 text-muted-foreground"
                        />

                        <h2 className="text-xl font-semibold mb-2">
                            This playlist is empty
                        </h2>

                        <p className="text-muted-foreground">
                            Add videos to this playlist from the
                            video menu.
                        </p>

                    </div>

                ) : (

                    <div className="space-y-4">

                        {playlist.videos.map(
                            (video, index) => (

                                <div
                                    key={video._id}
                                    className="flex gap-4 border border-border rounded-xl p-3 hover:bg-accent transition"
                                >

                                    {/* NUMBER */}

                                    <div className="w-8 flex items-center justify-center text-muted-foreground font-medium">
                                        {index + 1}
                                    </div>

                                    {/* THUMBNAIL */}

                                    <div
                                        onClick={() =>
                                            router.push(
                                                `/watch/${video._id}`
                                            )
                                        }
                                        className="w-48 h-28 bg-muted rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                                    >

                                        {video.filepath ? (
                                            <video
                                                src={video.filepath}
                                                className="w-full h-full object-cover"
                                                muted
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ListVideo
                                                    size={35}
                                                    className="text-muted-foreground"
                                                />
                                            </div>
                                        )}

                                    </div>

                                    {/* VIDEO INFO */}

                                    <div
                                        onClick={() =>
                                            router.push(
                                                `/watch/${video._id}`
                                            )
                                        }
                                        className="flex-1 min-w-0 cursor-pointer py-1"
                                    >

                                        <h2 className="font-semibold text-lg line-clamp-2">
                                            {video.videotitle ||
                                                "Untitled Video"}
                                        </h2>

                                        <p className="text-sm text-muted-foreground mt-2">
                                            {video.videochanel ||
                                                "Unknown Channel"}
                                        </p>

                                        {typeof video.views ===
                                            "number" && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {video.views.toLocaleString()} views
                                                </p>
                                            )}

                                    </div>

                                    {/* REMOVE */}

                                    <button
                                        onClick={() =>
                                            removeVideo(video._id)
                                        }
                                        className="self-center p-2 rounded-full hover:bg-red-100 hover:text-red-600 transition"
                                        title="Remove from playlist"
                                    >
                                        <Trash2 size={20} />
                                    </button>

                                </div>

                            )
                        )}

                    </div>

                )}

            </div>

        </div>
    );
};

export default PlaylistPage;