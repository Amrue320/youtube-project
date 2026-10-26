
const rooms = new Map();

const MAX_PARTICIPANTS = 8;

function createRoomId() {
    return Math.random().toString(36).slice(2, 10);
}

function getPublicParticipants(room) {
    return Array.from(room.participants.values()).map((participant) => ({
        id: participant.id,
        name: participant.name,
        isHost: participant.isHost,
    }));
}

export default function registerWatchParty(io) {
    io.on("connection", (socket) => {
        socket.on("watch-party:create", ({ videoId, videoTitle, userName } = {}, callback) => {
            if (!videoId || !userName) {
                return callback?.({ ok: false, error: "Video and username are required." });
            }

            const roomId = createRoomId();

            const room = {
                id: roomId,
                videoId: String(videoId),
                videoTitle: String(videoTitle || "Watch Party"),
                hostId: socket.id,
                participants: new Map(),
                playback: { isPlaying: false, currentTime: 0, updatedAt: Date.now() },
                chat: [],
            };

            room.participants.set(socket.id, {
                id: socket.id,
                name: String(userName).slice(0, 40),
                isHost: true,
            });

            rooms.set(roomId, room);
            socket.join(roomId);
            socket.data.watchPartyRoomId = roomId;

            callback?.({
                ok: true,
                roomId,
                videoId: room.videoId,
                videoTitle: room.videoTitle,
                participants: getPublicParticipants(room),
                playback: room.playback,
            });

            io.to(roomId).emit("watch-party:participants", getPublicParticipants(room));
        });

        socket.on("watch-party:join", ({ roomId, userName } = {}, callback) => {
            const room = rooms.get(String(roomId || ""));

            if (!room) {
                return callback?.({ ok: false, error: "Watch Party room not found." });
            }

            if (!userName) {
                return callback?.({ ok: false, error: "Username is required." });
            }

            if (room.participants.size >= MAX_PARTICIPANTS) {
                return callback?.({ ok: false, error: "This room is full." });
            }

            // Avoid joining the same room twice from one socket.
            if (room.participants.has(socket.id)) {
                return callback?.({
                    ok: true,
                    roomId: room.id,
                    videoId: room.videoId,
                    videoTitle: room.videoTitle,
                    participants: getPublicParticipants(room),
                    playback: room.playback,
                    chat: room.chat,
                });
            }

            // Remove the socket from its previous room, if any.
            const previousRoomId = socket.data.watchPartyRoomId;
            if (previousRoomId && previousRoomId !== room.id) {
                leaveRoom(socket, io, previousRoomId);
            }

            room.participants.set(socket.id, {
                id: socket.id,
                name: String(userName).slice(0, 40),
                isHost: false,
            });

            socket.join(room.id);
            socket.data.watchPartyRoomId = room.id;

            callback?.({
                ok: true,
                roomId: room.id,
                videoId: room.videoId,
                videoTitle: room.videoTitle,
                participants: getPublicParticipants(room),
                playback: room.playback,
                chat: room.chat,
            });

            socket.to(room.id).emit("watch-party:participant-joined", {
                id: socket.id,
                name: String(userName).slice(0, 40),
            });

            io.to(room.id).emit("watch-party:participants", getPublicParticipants(room));
        });

        socket.on("watch-party:playback", ({ isPlaying, currentTime } = {}) => {
            const room = getSocketRoom(socket);
            if (!room || room.hostId !== socket.id) return;

            room.playback = {
                isPlaying: Boolean(isPlaying),
                currentTime: Math.max(0, Number(currentTime) || 0),
                updatedAt: Date.now(),
            };

            socket.to(room.id).emit("watch-party:playback", room.playback);
        });

        socket.on("watch-party:chat", ({ message } = {}) => {
            const room = getSocketRoom(socket);
            if (!room || typeof message !== "string") return;

            const text = message.trim().slice(0, 1000);
            if (!text) return;

            const participant = room.participants.get(socket.id);
            if (!participant) return;

            const chatMessage = {
                id: `${Date.now()}-${socket.id}`,
                userId: socket.id,
                userName: participant.name,
                message: text,
                createdAt: new Date().toISOString(),
            };

            room.chat.push(chatMessage);
            if (room.chat.length > 100) room.chat.shift();

            io.to(room.id).emit("watch-party:chat", chatMessage);
        });

        // WebRTC signaling: relay offers, answers, and ICE candidates.
        socket.on("watch-party:signal", ({ targetId, signal } = {}) => {
            const room = getSocketRoom(socket);
            if (!room || !targetId || !signal) return;
            if (!room.participants.has(targetId)) return;

            io.to(targetId).emit("watch-party:signal", {
                fromId: socket.id,
                signal,
            });
        });

        socket.on("watch-party:leave", () => {
            const roomId = socket.data.watchPartyRoomId;
            if (roomId) leaveRoom(socket, io, roomId);
        });

        socket.on("disconnect", () => {
            const roomId = socket.data.watchPartyRoomId;
            if (roomId) leaveRoom(socket, io, roomId);
        });
    });
}

function getSocketRoom(socket) {
    const roomId = socket.data.watchPartyRoomId;
    return roomId ? rooms.get(roomId) : null;
}

function leaveRoom(socket, io, roomId) {
    const room = rooms.get(roomId);
    socket.leave(roomId);
    delete socket.data.watchPartyRoomId;

    if (!room || !room.participants.has(socket.id)) return;

    room.participants.delete(socket.id);

    if (room.hostId === socket.id) {
        // Close the room when its host leaves.
        io.to(roomId).emit("watch-party:ended", {
            message: "The host has left the Watch Party.",
        });

        for (const participantId of room.participants.keys()) {
            const participantSocket = io.sockets.sockets.get(participantId);
            if (participantSocket) {
                participantSocket.leave(roomId);
                delete participantSocket.data.watchPartyRoomId;
            }
        }

        rooms.delete(roomId);
        return;
    }

    io.to(roomId).emit("watch-party:participant-left", {
        id: socket.id,
    });

    io.to(roomId).emit("watch-party:participants", getPublicParticipants(room));
}
