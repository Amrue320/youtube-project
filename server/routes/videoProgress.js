import express from "express";

import {
    saveVideoProgress,
    getVideoProgress,
    getContinueWatching,
    deleteVideoProgress,
    clearContinueWatching,
} from "../controllers/videoProgress.js";

const routes = express.Router();

// Save/update video progress
routes.post("/", saveVideoProgress);

// Continue Watching routes MUST come before generic routes
routes.get("/continue/:userId", getContinueWatching);

routes.delete("/continue/:userId", clearContinueWatching);

// Generic video progress routes
routes.get("/:userId/:videoId", getVideoProgress);

routes.delete("/:userId/:videoId", deleteVideoProgress);

export default routes;