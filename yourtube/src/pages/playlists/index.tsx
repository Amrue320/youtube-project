"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Plus, Trash2, ListVideo } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface Playlist {
    _id: string;
    name: string;
    description?: string;
    videos?: any[];
    createdAt?: string;
}

const PlaylistsPage = () => {
    const router = useRouter();
    const { user } = useUser();

    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);

    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // ================= FETCH PLAYLISTS =================

    const fetchPlaylists = async () => {
        if (!user?._id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await axiosInstance.get(
                `/playlist/user/${user._id}`
            );

            setPlaylists(response.data.playlists || []);
        } catch (error) {
            console.error("Error fetching playlists:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaylists();
    }, [user?._id]);

    // ================= CREATE PLAYLIST =================

    const createPlaylist = async () => {
        if (!user?._id) {
            alert("Please sign in first.");
            return;
        }

        if (!name.trim()) {
            alert("Please enter a playlist name.");
            return;
        }

        try {
            await axiosInstance.post("/playlist", {
                owner: user._id,
                name: name.trim(),
                description: description.trim(),
            });

            setName("");
            setDescription("");
            setCreating(false);

            await fetchPlaylists();
        } catch (error) {
            console.error("Error creating playlist:", error);
            alert("Could not create playlist.");
        }
    };

    // ================= DELETE PLAYLIST =================

    const deletePlaylist = async (
        e: React.MouseEvent,
        playlistId: string
    ) => {
        e.stopPropagation();

        const confirmed = window.confirm(
            "Are you sure you want to delete this playlist?"
        );

        if (!confirmed) return;

        try {
            await axiosInstance.delete(`/playlist/${playlistId}`);

            setPlaylists((previous) =>
                previous.filter(
                    (playlist) => playlist._id !== playlistId
                )
            );
        } catch (error) {
            console.error("Error deleting playlist:", error);
            alert("Could not delete playlist.");
        }
    };

    // ================= NOT SIGNED IN =================

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <ListVideo
                        size={60}
                        className="mx-auto mb-4 text-muted-foreground"
                    />

                    <h1 className="text-2xl font-bold mb-2">
                        Your Playlists
                    </h1>

                    <p className="text-muted-foreground">
                        Sign in to create and manage playlists.
                    </p>
                </div>
            </div>
        );
    }

    // ================= PAGE =================

    return (
        <div className="min-h-screen px-6 py-8 bg-background text-foreground">
            <div className="max-w-6xl mx-auto">

                {/* HEADER */}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

                    <div>
                        <h1 className="text-3xl font-bold">
                            My Playlists
                        </h1>

                        <p className="text-muted-foreground mt-1">
                            Create playlists and organize your videos.
                        </p>
                    </div>

                    <button
                        onClick={() => setCreating(!creating)}
                        className="flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition"
                    >
                        <Plus size={20} />

                        New Playlist
                    </button>

                </div>

                {/* CREATE PLAYLIST FORM */}

                {creating && (
                    <div className="border border-border rounded-xl p-5 mb-8 bg-background">

                        <h2 className="text-xl font-semibold mb-4">
                            Create Playlist
                        </h2>

                        <input
                            type="text"
                            placeholder="Playlist name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-border rounded-lg px-4 py-3 mb-3 bg-background text-foreground outline-none focus:ring-2 focus:ring-red-500"
                        />

                        <textarea
                            placeholder="Description (optional)"
                            value={description}
                            onChange={(e) =>
                                setDescription(e.target.value)
                            }
                            className="w-full border border-border rounded-lg px-4 py-3 mb-4 bg-background text-foreground outline-none focus:ring-2 focus:ring-red-500 resize-none"
                            rows={3}
                        />

                        <div className="flex gap-3">

                            <button
                                onClick={createPlaylist}
                                className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition"
                            >
                                Create
                            </button>

                            <button
                                onClick={() => {
                                    setCreating(false);
                                    setName("");
                                    setDescription("");
                                }}
                                className="border border-border px-5 py-2 rounded-lg hover:bg-accent transition"
                            >
                                Cancel
                            </button>

                        </div>

                    </div>
                )}

                {/* LOADING */}

                {loading ? (
                    <div className="text-center py-20 text-muted-foreground">
                        Loading playlists...
                    </div>

                ) : playlists.length === 0 ? (

                    /* EMPTY STATE */

                    <div className="text-center py-20 border border-border rounded-xl">

                        <ListVideo
                            size={60}
                            className="mx-auto mb-4 text-muted-foreground"
                        />

                        <h2 className="text-xl font-semibold mb-2">
                            No playlists yet
                        </h2>

                        <p className="text-muted-foreground mb-5">
                            Create your first playlist to start
                            organizing videos.
                        </p>

                        <button
                            onClick={() => setCreating(true)}
                            className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition"
                        >
                            Create Playlist
                        </button>

                    </div>

                ) : (

                    /* PLAYLIST GRID */

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                        {playlists.map((playlist) => (

                            <div
                                key={playlist._id}
                                onClick={() =>
                                    router.push(`/playlist/${playlist._id}`)
                                }
                                className="border border-border rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-red-500 transition bg-background"
                            >

                                <div className="flex justify-between items-start">

                                    <div className="flex items-center gap-3">

                                        <div className="p-3 rounded-lg bg-accent">
                                            <ListVideo size={28} />
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-semibold">
                                                {playlist.name}
                                            </h2>

                                            <p className="text-sm text-muted-foreground">
                                                {playlist.videos?.length || 0} videos
                                            </p>
                                        </div>

                                    </div>

                                    <button
                                        onClick={(e) =>
                                            deletePlaylist(
                                                e,
                                                playlist._id
                                            )
                                        }
                                        className="p-2 rounded-full hover:bg-accent transition"
                                        title="Delete playlist"
                                    >
                                        <Trash2 size={18} />
                                    </button>

                                </div>

                                {playlist.description && (
                                    <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                                        {playlist.description}
                                    </p>
                                )}

                            </div>

                        ))}

                    </div>

                )}

            </div>
        </div>
    );
};

export default PlaylistsPage;