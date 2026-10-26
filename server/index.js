
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import registerWatchParty from "./watchParty.js";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import subscriptionroutes from "./routes/subscription.js";
import notificationroutes from "./routes/notification.js";
import playlistroutes from "./routes/playlist.js";
import videoProgressRoutes from "./routes/videoProgress.js";
import userAnalyticsRoutes from "./routes/userAnalytics.js";

dotenv.config();

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(
  express.json({
    limit: "30mb",
  })
);

app.use(
  express.urlencoded({
    limit: "30mb",
    extended: true,
  })
);

app.use("/uploads", express.static(path.join("uploads")));

app.use(bodyParser.json());

// ==========================================
// HTTP SERVER + SOCKET.IO
// ==========================================

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Make Socket.IO available to Express routes/controllers.
app.set("io", io);

// Basic connection handling.
// Watch Party room events will be added in the next step.
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
});

registerWatchParty(io);

// ==========================================
// APPLICATION ROUTES
// ==========================================

app.get("/", (req, res) => {
  res.send("YouTube backend is working");
});

app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/subscription", subscriptionroutes);
app.use("/notification", notificationroutes);
app.use("/playlist", playlistroutes);

app.use("/progress", videoProgressRoutes);
app.use("/analytics", userAnalyticsRoutes);

// ==========================================
// MONGODB CONNECTION
// ==========================================

const DBURL = process.env.DB_URL;

if (!DBURL) {
  console.error("DB_URL is missing from server/.env");
} else {
  mongoose
    .connect(DBURL)
    .then(() => {
      console.log("MongoDB connected");
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
    });
}

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Socket.IO is ready for connections");
});
