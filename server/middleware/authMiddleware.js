
import jwt from "jsonwebtoken";
import users from "../Modals/Auth.js";
import mongoose from "mongoose";

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const token = authHeader.split(" ")[1];

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");
            return res.status(500).json({
                message: "Server authentication is not configured",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (
            !decoded.userId ||
            !mongoose.Types.ObjectId.isValid(decoded.userId)
        ) {
            return res.status(401).json({
                message: "Invalid authentication token",
            });
        }

        const user = await users
            .findById(decoded.userId)
            .select("_id role");

        if (!user) {
            return res.status(401).json({
                message: "User account not found",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token",
            });
        }

        console.error("Authentication error:", error);

        return res.status(500).json({
            message: "Authentication failed",
        });
    }
};

// Authentication for any logged-in user
export const verifyToken = authenticate;

// Authentication specifically for administrators
export const verifyAdmin = async (req, res, next) => {
    await authenticate(req, res, () => {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin access required",
            });
        }

        next();
    });
};
