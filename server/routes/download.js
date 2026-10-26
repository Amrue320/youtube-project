
import express from "express";

import {
    downloadVideo,
    getDownloadHistory,
    removeDownloadHistory,
} from "../controllers/download.js";

const routes = express.Router();

// Download a video
routes.post("/", downloadVideo);

// Get a user's download history
routes.get("/history/:userId", getDownloadHistory);

// Remove one entry from download history
routes.delete("/history/:id", removeDownloadHistory);

export default routes;
