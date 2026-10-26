import express from "express";

import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
} from "../controllers/playlist.js";

const routes = express.Router();

// Create a new playlist
routes.post("/", createPlaylist);

// Get all playlists of a user
routes.get("/user/:userId", getUserPlaylists);

// Get a single playlist
routes.get("/:id", getPlaylistById);

// Add video to playlist
routes.post("/:id/video", addVideoToPlaylist);

// Remove video from playlist
routes.delete("/:id/video/:videoId", removeVideoFromPlaylist);

// Delete playlist
routes.delete("/:id", deletePlaylist);

export default routes;