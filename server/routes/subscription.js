
import express from "express";

import {
    handleSubscription,
    checkSubscription,
    getSubscriptions,
} from "../controllers/subscription.js";

import {
    getMembershipPlan,
    cancelMembership,
} from "../controllers/membership.js";

import {
    createMockOrder,
    confirmMockPayment,
} from "../controllers/mockPayment.js";

const routes = express.Router();

// Existing channel subscribe/unsubscribe routes — preserved.
routes.post("/:channelId", handleSubscription);
routes.get("/check/:channelId/:userId", checkSubscription);
routes.get("/user/:userId", getSubscriptions);

// Existing membership routes — preserved.
routes.get("/plan/:userId", getMembershipPlan);
routes.post("/plan/cancel", cancelMembership);

// New mock membership payment routes.
routes.post("/mock/create-order", createMockOrder);
routes.post("/mock/confirm", confirmMockPayment);

export default routes;
