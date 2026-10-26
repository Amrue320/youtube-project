import mongoose from "mongoose";
import playlist from "../Modals/playlist.js";

// ================= CREATE PLAYLIST =================

export const createPlaylist = async (req, res) => {
    try {
        const { owner, name, description } = req.body;

        if (!owner || !name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Owner and playlist name are required.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(owner)) {
            return res.status(400).json({
                success: false,
                message: "Invalid owner ID.",
            });
        }

        const newPlaylist = await playlist.create({
            owner,
            name: name.trim(),
            description: description?.trim() || "",
            videos: [],
        });

        return res.status(201).json({
            success: true,
            message: "Playlist created successfully.",
            playlist: newPlaylist,
        });
    } catch (error) {
        console.error("Create playlist error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create playlist.",
        });
    }
};

// ================= GET USER PLAYLISTS =================

export const getUserPlaylists = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID.",
            });
        }

        const playlists = await playlist
            .find({ owner: userId })
            .populate(
                "videos",
                "videotitle filepath videochanel uploader views"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            playlists,
        });
    } catch (error) {
        console.error(
            "Get user playlists error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch playlists.",
        });
    }
};

// ================= GET SINGLE PLAYLIST =================

export const getPlaylistById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid playlist ID.",
            });
        }

        const foundPlaylist = await playlist
            .findById(id)
            .populate(
                "owner",
                "name channelname image description"
            )
            .populate(
                "videos",
                "videotitle filepath videochanel uploader views createdAt"
            );

        if (!foundPlaylist) {
            return res.status(404).json({
                success: false,
                message: "Playlist not found.",
            });
        }

        return res.status(200).json({
            success: true,
            playlist: foundPlaylist,
        });
    } catch (error) {
        console.error(
            "Get playlist error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch playlist.",
        });
    }
};

// ================= ADD VIDEO =================

export const addVideoToPlaylist = async (
    req,
    res
) => {
    try {
        const { id } = req.params;
        const { videoId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid playlist ID.",
            });
        }

        if (
            !videoId ||
            !mongoose.Types.ObjectId.isValid(videoId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid video ID is required.",
            });
        }

        const updatedPlaylist =
            await playlist.findByIdAndUpdate(
                id,
                {
                    $addToSet: {
                        videos: videoId,
                    },
                },
                {
                    new: true,
                }
            ).populate(
                "videos",
                "videotitle filepath videochanel uploader views"
            );

        if (!updatedPlaylist) {
            return res.status(404).json({
                success: false,
                message: "Playlist not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Video added to playlist.",
            playlist: updatedPlaylist,
        });
    } catch (error) {
        console.error(
            "Add video to playlist error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to add video to playlist.",
        });
    }
};

// ================= REMOVE VIDEO =================

export const removeVideoFromPlaylist = async (
    req,
    res
) => {
    try {
        const { id, videoId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid playlist ID.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID.",
            });
        }

        const updatedPlaylist =
            await playlist.findByIdAndUpdate(
                id,
                {
                    $pull: {
                        videos: videoId,
                    },
                },
                {
                    new: true,
                }
            ).populate(
                "videos",
                "videotitle filepath videochanel uploader views"
            );

        if (!updatedPlaylist) {
            return res.status(404).json({
                success: false,
                message: "Playlist not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Video removed from playlist.",
            playlist: updatedPlaylist,
        });
    } catch (error) {
        console.error(
            "Remove video from playlist error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to remove video.",
        });
    }
};

// ================= DELETE PLAYLIST =================

export const deletePlaylist = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid playlist ID.",
            });
        }

        const deletedPlaylist =
            await playlist.findByIdAndDelete(id);

        if (!deletedPlaylist) {
            return res.status(404).json({
                success: false,
                message: "Playlist not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Playlist deleted successfully.",
        });
    } catch (error) {
        console.error(
            "Delete playlist error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to delete playlist.",
        });
    }
};