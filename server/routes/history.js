import express from "express";

import {
  getallhistoryVideo,
  handlehistory,
  handleview,
  removeHistoryVideo,
  clearHistory,
} from "../controllers/history.js";

const routes = express.Router();

// Get user's watch history
routes.get("/:userId", getallhistoryVideo);

// Remove one history item
routes.delete("/:historyId", removeHistoryVideo);

// Clear user's complete history
routes.delete("/user/:userId", clearHistory);

// Add/update video view
routes.post("/views/:videoId", handleview);

// Add video to history
routes.post("/:videoId", handlehistory);

export default routes;