import express from "express";
import {
    login,
    updateprofile,
    subscribeChannel,
    checkSubscription,
    getSubscriptions,
    getUserById,
    getChannel,
} from "../controllers/auth.js";

const routes = express.Router();

routes.post("/login", login);

routes.patch("/update/:id", updateprofile);

routes.post("/subscribe/:id", subscribeChannel);

routes.get(
    "/checksubscription/:channelId/:userId",
    checkSubscription
);

routes.get(
    "/subscriptions/:userId",
    getSubscriptions
);

// Public channel details
routes.get("/channel/:id", getChannel);

// Get user details
routes.get("/user/:id", getUserById);

export default routes;