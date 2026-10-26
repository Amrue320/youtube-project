
import express from "express";

import {
    uploadvideo,
    getallvideo,
    searchVideos,
    incrementViews,
    handleLike,
    checkLike,
    getCreatorAnalytics,
    getChannelVideos,
} from "../controllers/video.js";

import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.single("file"), uploadvideo);
routes.get("/getall", getallvideo);
routes.get("/search", searchVideos);
routes.post("/views/:id", incrementViews);
routes.post("/like/:id", handleLike);
routes.get("/like/check/:videoId/:userId", checkLike);
routes.get("/channel/:userId", getChannelVideos);
routes.get("/analytics/:userId", getCreatorAnalytics);

export default routes;
