import express from "express";

import {
    getUserAnalytics,
} from "../controllers/userAnalytics.js";

const routes = express.Router();

routes.get(
    "/user/:userId",
    getUserAnalytics
);

export default routes;