import express from "express";

import {
  getallwatchlater,
  handlewatchlater,
  checkwatchlater,
} from "../controllers/watchlater.js";

const routes = express.Router();

// Check whether a video is already in Watch Later
routes.get(
  "/check/:videoId/:userId",
  checkwatchlater
);

// Get all Watch Later videos for a user
routes.get(
  "/:userId",
  getallwatchlater
);

// Add / remove video from Watch Later
routes.post(
  "/:videoId",
  handlewatchlater
);

export default routes;