/**
 * WebRTC signaling relay for Watch Party calls.
 * Import and call registerWatchPartyCallEvents(io) after creating your Socket.IO server.
 * This module deliberately does not replace the existing room/chat/playback handlers.
 */
export default function registerWatchPartyCallEvents(io) {
    io.on("connection", (socket) => {
        socket.on("watch-party:signal", (payload = {}) => {
            const { roomId, to, description, candidate } = payload;
            if (typeof roomId !== "string" || !roomId || !socket.rooms.has(roomId)) return;
            if (typeof to !== "string" || !to || to === socket.id) return;
            const target = io.sockets.sockets.get(to);
            if (!target || !target.rooms.has(roomId)) return;
            target.emit("watch-party:signal", {
                roomId,
                from: socket.id,
                ...(description ? { description } : {}),
                ...(candidate ? { candidate } : {}),
            });
        });

        socket.on("watch-party:call-ready", ({ roomId } = {}) => {
            if (typeof roomId !== "string" || !roomId || !socket.rooms.has(roomId)) return;
            socket.to(roomId).emit("watch-party:call-ready", { participantId: socket.id });
        });

        socket.on("watch-party:call-leave", ({ roomId } = {}) => {
            if (typeof roomId !== "string" || !roomId || !socket.rooms.has(roomId)) return;
            socket.to(roomId).emit("watch-party:call-left", { participantId: socket.id });
        });
    });
}
