import express from "express";

import {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
} from "../controllers/notification.js";

const routes = express.Router();

// Create notification
routes.post("/", createNotification);

// Get user's notifications
routes.get("/:userId", getNotifications);

// Mark one notification as read
routes.put("/read/:id", markAsRead);

// Mark all notifications as read
routes.put("/read-all/:userId", markAllAsRead);

// Delete notification
routes.delete("/:id", deleteNotification);

export default routes;