
import express from "express";

import {
    deletecomment,
    getallcomment,
    postcomment,
    editcomment,
    reportcomment,
} from "../controllers/comment.js";

import { reactToComment } from "../controllers/commentReaction.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const routes = express.Router();

// Public: get comments and replies for a video
routes.get("/:videoid", getallcomment);

// Authenticated comment actions
routes.post("/postcomment", verifyToken, postcomment);
routes.post("/reaction/:id", verifyToken, reactToComment);
routes.post("/report/:id", verifyToken, reportcomment);
routes.delete("/deletecomment/:id", verifyToken, deletecomment);
routes.post("/editcomment/:id", verifyToken, editcomment);

export default routes;
