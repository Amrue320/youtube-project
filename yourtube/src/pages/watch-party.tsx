
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { io, Socket } from "socket.io-client";
import axiosInstance from "@/lib/axiosinstance";
import Videopplayer from "@/components/Videopplayer";
import {
    Copy,
    LogOut,
    MessageCircle,
    Play,
    Users,
    Video,
    VideoOff,
    Mic,
    MicOff,
    MonitorUp,
    MonitorOff,
} from "lucide-react";

type Participant = {
    id: string;
    name: string;
    isHost: boolean;
};

type ChatMessage = {
    id: string;
    userId: string;
    userName: string;
    message: string;
    createdAt: string;
};

type Playback = {
    isPlaying: boolean;
    currentTime: number;
    updatedAt: number;
};

type VideoItem = {
    _id: string;
    title?: string;
    videotitle?: string;
    filepath?: string;
    videoUrl?: string;
};

type RoomResponse = {
    ok: boolean;
    error?: string;
    roomId?: string;
    videoId?: string;
    videoTitle?: string;
    participants?: Participant[];
    playback?: Playback;
    chat?: ChatMessage[];
};

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function WatchPartyPage() {
    const socketRef = useRef<Socket | null>(null);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const [cameraOn, setCameraOn] = useState(false);
    const [micOn, setMicOn] = useState(false);
    const [sharingScreen, setSharingScreen] = useState(false);
    const [mediaError, setMediaError] = useState("");

    const [userName, setUserName] = useState("");
    const [videoId, setVideoId] = useState("");
    const [videoTitle, setVideoTitle] = useState("");
    const [roomCode, setRoomCode] = useState("");

    const [activeRoom, setActiveRoom] = useState("");
    const [activeVideoId, setActiveVideoId] = useState("");
    const [activeVideoTitle, setActiveVideoTitle] = useState("");
    const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
    const [videoLoading, setVideoLoading] = useState(false);
    const [videoLoadError, setVideoLoadError] = useState("");
    const [isHost, setIsHost] = useState(false);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [message, setMessage] = useState("");
    const [playback, setPlayback] = useState<Playback>({
        isPlaying: false,
        currentTime: 0,
        updatedAt: Date.now(),
    });

    const [status, setStatus] = useState("Connecting to server...");
    const [connected, setConnected] = useState(false);
    const [busy, setBusy] = useState(false);

    function closePeer(peerId: string) {
        const peer = peerConnectionsRef.current.get(peerId);
        if (peer) {
            peer.ontrack = null;
            peer.onicecandidate = null;
            peer.close();
            peerConnectionsRef.current.delete(peerId);
        }
        setRemoteStreams((current) => {
            const next = { ...current };
            delete next[peerId];
            return next;
        });
    }

    function closeAllPeers() {
        for (const peerId of Array.from(peerConnectionsRef.current.keys())) closePeer(peerId);
    }

    async function ensureLocalMedia() {
        if (localStreamRef.current) return localStreamRef.current;
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Camera and microphone are unavailable. Use localhost or HTTPS.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setCameraOn(stream.getVideoTracks().some((track) => track.enabled));
        setMicOn(stream.getAudioTracks().some((track) => track.enabled));
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        return stream;
    }

    function createPeer(peerId: string) {
        const existing = peerConnectionsRef.current.get(peerId);
        if (existing) return existing;
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peerConnectionsRef.current.set(peerId, pc);
        const stream = localStreamRef.current;
        if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit("watch-party:signal", {
                    to: peerId,
                    from: socketRef.current?.id,
                    signal: { type: "ice", candidate: event.candidate },
                });
            }
        };
        pc.ontrack = (event) => {
            const incoming = event.streams[0];
            if (incoming) setRemoteStreams((current) => ({ ...current, [peerId]: incoming }));
        };
        pc.onconnectionstatechange = () => {
            if (["failed", "closed", "disconnected"].includes(pc.connectionState)) closePeer(peerId);
        };
        return pc;
    }

    async function connectToParticipant(peerId: string) {
        const socket = socketRef.current;
        if (!socket || !peerId || peerId === socket.id || peerConnectionsRef.current.has(peerId)) return;
        try {
            await ensureLocalMedia();
            const pc = createPeer(peerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("watch-party:signal", {
                to: peerId,
                from: socket.id,
                signal: { type: "description", description: pc.localDescription },
            });
        } catch (error) {
            console.error("Could not start video call:", error);
            setMediaError(error instanceof Error ? error.message : "Could not start camera/microphone.");
        }
    }

    async function handleSignal(payload: { from?: string; to?: string; signal?: any }) {
        const socket = socketRef.current;
        const from = payload?.from;
        const signal = payload?.signal;
        if (!socket || !from || from === socket.id || !signal) return;
        if (payload.to && payload.to !== socket.id) return;
        try {
            await ensureLocalMedia();
            const pc = createPeer(from);
            if (signal.type === "description" && signal.description) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.description));
                if (signal.description.type === "offer") {
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit("watch-party:signal", {
                        to: from,
                        from: socket.id,
                        signal: { type: "description", description: pc.localDescription },
                    });
                }
            } else if (signal.type === "ice" && signal.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
        } catch (error) {
            console.error("WebRTC signaling error:", error);
            setMediaError("The call connection failed. Check camera/microphone permissions and try again.");
        }
    }

    async function toggleCamera() {
        try {
            const stream = await ensureLocalMedia();
            const tracks = stream.getVideoTracks();
            if (!tracks.length) throw new Error("No camera track is available.");
            const next = !tracks[0].enabled;
            tracks.forEach((track) => { track.enabled = next; });
            setCameraOn(next);
        } catch (error) {
            setMediaError(error instanceof Error ? error.message : "Unable to access camera.");
        }
    }

    async function toggleMicrophone() {
        try {
            const stream = await ensureLocalMedia();
            const tracks = stream.getAudioTracks();
            if (!tracks.length) throw new Error("No microphone track is available.");
            const next = !tracks[0].enabled;
            tracks.forEach((track) => { track.enabled = next; });
            setMicOn(next);
        } catch (error) {
            setMediaError(error instanceof Error ? error.message : "Unable to access microphone.");
        }
    }

    async function toggleScreenShare() {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
            const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
            if (cameraTrack) {
                for (const pc of peerConnectionsRef.current.values()) {
                    const sender = pc.getSenders().find((item) => item.track?.kind === "video");
                    if (sender) await sender.replaceTrack(cameraTrack);
                }
            }
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
            setSharingScreen(false);
            return;
        }
        try {
            await ensureLocalMedia();
            if (!navigator.mediaDevices?.getDisplayMedia) {
                throw new Error("Screen sharing is not supported by this browser. Use localhost or HTTPS.");
            }
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) throw new Error("No screen video track was selected.");
            screenStreamRef.current = screenStream;
            for (const pc of peerConnectionsRef.current.values()) {
                const sender = pc.getSenders().find((item) => item.track?.kind === "video");
                if (sender) await sender.replaceTrack(screenTrack);
            }
            if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
            screenTrack.onended = () => { void stopScreenShare(); };
            setSharingScreen(true);
            setMediaError("");
        } catch (error) {
            setMediaError(error instanceof Error ? error.message : "Unable to share screen.");
        }
    }

    async function stopScreenShare() {
        const screen = screenStreamRef.current;
        if (screen) screen.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        for (const pc of peerConnectionsRef.current.values()) {
            const sender = pc.getSenders().find((item) => item.track?.kind === "video");
            if (sender) await sender.replaceTrack(cameraTrack || null);
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        setSharingScreen(false);
    }

    function stopMedia() {
        if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        closeAllPeers();
        setCameraOn(false);
        setMicOn(false);
        setSharingScreen(false);
        setRemoteStreams({});
    }

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
            setStatus("Connected");
        });

        socket.on("disconnect", () => {
            setConnected(false);
            setStatus("Disconnected. Reconnecting...");
        });

        socket.on("connect_error", () => {
            setStatus("Cannot connect to the server. Check that the backend is running.");
        });

        socket.on("watch-party:participants", (list: Participant[]) => {
            setParticipants(list);
        });

        socket.on("watch-party:chat", (chatMessage: ChatMessage) => {
            setMessages((previous) => [...previous, chatMessage].slice(-100));
        });

        socket.on("watch-party:playback", (nextPlayback: Playback) => {
            setPlayback(nextPlayback);
        });

        socket.on("watch-party:participant-joined", (participant: Participant) => {
            setStatus(`${participant.name} joined the party.`);
        });

        socket.on("watch-party:signal", (payload: { from?: string; to?: string; signal?: any }) => {
            void handleSignal(payload);
        });

        socket.on("watch-party:participant-left", (payload?: { id?: string; participantId?: string }) => {
            const peerId = payload?.id || payload?.participantId;
            if (peerId) closePeer(peerId);
            setStatus("A participant left the party.");
        });

        socket.on("watch-party:ended", ({ message }: { message: string }) => {
            setStatus(message || "The Watch Party has ended.");
            stopMedia();
            setActiveRoom("");
            setIsHost(false);
            setParticipants([]);
        });

        return () => {
            stopMedia();
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!activeVideoId) {
            setSelectedVideo(null);
            setVideoLoadError("");
            return;
        }

        let cancelled = false;
        async function loadSelectedVideo() {
            setVideoLoading(true);
            setVideoLoadError("");
            try {
                const response = await axiosInstance.get("/video/getall");
                const payload = response.data;
                const videos: VideoItem[] = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.videos)
                        ? payload.videos
                        : Array.isArray(payload?.data)
                            ? payload.data
                            : Array.isArray(payload?.data?.videos)
                                ? payload.data.videos
                                : [];
                const match = videos.find((item) => String(item?._id) === String(activeVideoId));
                if (!match) {
                    if (!cancelled) setVideoLoadError("Video not found. Check the video ID and make sure the video is available in YourTube.");
                    return;
                }
                if (!cancelled) {
                    setSelectedVideo(match);
                    setActiveVideoTitle(match.title || match.videotitle || activeVideoTitle || "Watch Party");
                }
            } catch (error) {
                console.error("Unable to load Watch Party video:", error);
                if (!cancelled) setVideoLoadError("Could not load video details. Check that the backend is running and the video API is available.");
            } finally {
                if (!cancelled) setVideoLoading(false);
            }
        }
        void loadSelectedVideo();
        return () => { cancelled = true; };
    }, [activeVideoId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function applyRoom(response: RoomResponse, host: boolean) {
        if (!response.ok || !response.roomId) {
            setStatus(response.error || "Could not enter the Watch Party.");
            return;
        }

        setActiveRoom(response.roomId);
        setActiveVideoId(response.videoId || "");
        setActiveVideoTitle(response.videoTitle || "Watch Party");
        setParticipants(response.participants || []);
        setPlayback(
            response.playback || {
                isPlaying: false,
                currentTime: 0,
                updatedAt: Date.now(),
            }
        );
        setMessages(response.chat || []);
        setIsHost(host);
        setRoomCode(response.roomId);
        setStatus(host ? "Party created successfully." : "Joined the party.");
        setMediaError("");
        void (async () => {
            try {
                await ensureLocalMedia();
                if (!host) {
                    (response.participants || []).forEach((participant) => {
                        if (participant.id !== socketRef.current?.id) void connectToParticipant(participant.id);
                    });
                }
            } catch (error) {
                setMediaError(error instanceof Error ? error.message : "Allow camera and microphone access to join the call.");
            }
        })();
    }

    function createParty(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!socketRef.current?.connected) {
            setStatus("Wait until the server connection is ready.");
            return;
        }

        if (!userName.trim() || !videoId.trim()) {
            setStatus("Enter your name and video ID.");
            return;
        }

        setBusy(true);

        socketRef.current.emit(
            "watch-party:create",
            {
                videoId: videoId.trim(),
                videoTitle: videoTitle.trim() || "Watch Party",
                userName: userName.trim(),
            },
            (response: RoomResponse) => {
                setBusy(false);
                applyRoom(response, true);
            }
        );
    }

    function joinParty(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!socketRef.current?.connected) {
            setStatus("Wait until the server connection is ready.");
            return;
        }

        if (!userName.trim() || !roomCode.trim()) {
            setStatus("Enter your name and invitation code.");
            return;
        }

        setBusy(true);

        socketRef.current.emit(
            "watch-party:join",
            {
                roomId: roomCode.trim(),
                userName: userName.trim(),
            },
            (response: RoomResponse) => {
                setBusy(false);
                applyRoom(response, false);
            }
        );
    }

    function sendMessage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const text = message.trim();
        if (!text || !activeRoom) return;

        socketRef.current?.emit("watch-party:chat", { message: text });
        setMessage("");
    }

    function updatePlayback(isPlaying: boolean) {
        if (!isHost || !activeRoom) return;

        const nextPlayback = {
            isPlaying,
            currentTime: playback.currentTime,
            updatedAt: Date.now(),
        };

        setPlayback(nextPlayback);
        socketRef.current?.emit("watch-party:playback", nextPlayback);
    }

    function leaveParty() {
        socketRef.current?.emit("watch-party:leave");
        stopMedia();
        setActiveRoom("");
        setActiveVideoId("");
        setActiveVideoTitle("");
        setSelectedVideo(null);
        setVideoLoadError("");
        setParticipants([]);
        setMessages([]);
        setIsHost(false);
        setStatus("You left the Watch Party.");
    }

    async function copyInvite() {
        const invite = `${window.location.origin}/watch-party?room=${activeRoom}`;

        try {
            await navigator.clipboard.writeText(invite);
            setStatus("Invitation link copied.");
        } catch {
            setStatus(`Copy this invitation link: ${invite}`);
        }
    }

    return (
        <main className="min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-8">
            <div className="mx-auto max-w-6xl">
                <header className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-red-600 p-3">
                            <Users size={25} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Watch Party</h1>
                            <p className="text-sm text-gray-400">
                                Watch together, chat together.
                            </p>
                        </div>
                    </div>

                    <p className="mt-4 text-sm text-gray-400">
                        Server:{" "}
                        <span className={connected ? "text-green-400" : "text-red-400"}>
                            {status}
                        </span>
                    </p>
                </header>

                {!activeRoom ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        <form
                            onSubmit={createParty}
                            className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-6"
                        >
                            <h2 className="text-xl font-semibold">Create a party</h2>

                            <label className="block text-sm text-gray-300">
                                Your display name
                                <input
                                    value={userName}
                                    onChange={(event) => setUserName(event.target.value)}
                                    maxLength={40}
                                    required
                                    className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-red-500"
                                    placeholder="Enter your name"
                                />
                            </label>

                            <label className="block text-sm text-gray-300">
                                Video ID
                                <input
                                    value={videoId}
                                    onChange={(event) => setVideoId(event.target.value)}
                                    required
                                    className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-red-500"
                                    placeholder="YourTube video ID"
                                />
                            </label>

                            <label className="block text-sm text-gray-300">
                                Video title (optional)
                                <input
                                    value={videoTitle}
                                    onChange={(event) => setVideoTitle(event.target.value)}
                                    className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-red-500"
                                    placeholder="Enter a title"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={!connected || busy}
                                className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {busy ? "Creating..." : "Create Watch Party"}
                            </button>
                        </form>

                        <form
                            onSubmit={joinParty}
                            className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-6"
                        >
                            <h2 className="text-xl font-semibold">Join a party</h2>

                            <label className="block text-sm text-gray-300">
                                Your display name
                                <input
                                    value={userName}
                                    onChange={(event) => setUserName(event.target.value)}
                                    maxLength={40}
                                    required
                                    className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-red-500"
                                    placeholder="Enter your name"
                                />
                            </label>

                            <label className="block text-sm text-gray-300">
                                Invitation code
                                <input
                                    value={roomCode}
                                    onChange={(event) => setRoomCode(event.target.value)}
                                    required
                                    className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-red-500"
                                    placeholder="Enter the room code"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={!connected || busy}
                                className="w-full rounded-lg border border-gray-700 px-4 py-3 font-semibold hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {busy ? "Joining..." : "Join Watch Party"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                        <section className="space-y-5">
                            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-semibold">
                                            {activeVideoTitle}
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Room code: {activeRoom}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Video ID: {activeVideoId}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={copyInvite}
                                            className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm hover:bg-gray-800"
                                        >
                                            <Copy size={16} />
                                            Invite
                                        </button>

                                        <button
                                            onClick={leaveParty}
                                            className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm hover:bg-red-500"
                                        >
                                            <LogOut size={16} />
                                            Leave
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-800 bg-black p-3 sm:p-4">
                                {videoLoading ? (
                                    <p className="p-8 text-center text-sm text-gray-300">Loading video...</p>
                                ) : selectedVideo ? (
                                    <Videopplayer
                                        key={`${activeRoom}-${selectedVideo._id}`}
                                        video={selectedVideo}
                                        watchPartySocket={socketRef.current}
                                        watchPartyActive={Boolean(activeRoom)}
                                        watchPartyHost={isHost}
                                        watchPartyPlayback={playback}
                                    />
                                ) : (
                                    <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                                        <Video size={48} className="mb-4 text-gray-500" />
                                        <h3 className="text-lg font-semibold">{videoLoadError ? "Unable to load video" : "Loading party video"}</h3>
                                        <p className="mt-2 max-w-md text-sm text-gray-400">
                                            {videoLoadError || "Finding this video in your YourTube library..."}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                                <h3 className="mb-4 font-semibold">Video call</h3>
                                {mediaError && <p className="mb-3 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{mediaError}</p>}
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    <div className="overflow-hidden rounded-xl bg-black">
                                        <video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
                                        <p className="px-3 py-2 text-xs text-gray-300">You {sharingScreen ? "(sharing screen)" : "(camera)"}</p>
                                    </div>
                                    {Object.entries(remoteStreams).map(([peerId, stream]) => (
                                        <RemoteVideoTile key={peerId} stream={stream} participantName={participants.find((person) => person.id === peerId)?.name || "Participant"} />
                                    ))}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => void toggleMicrophone()} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${micOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-700 hover:bg-red-600"}`}>
                                        {micOn ? <Mic size={16} /> : <MicOff size={16} />}{micOn ? "Mute mic" : "Unmute mic"}
                                    </button>
                                    <button type="button" onClick={() => void toggleCamera()} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${cameraOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-700 hover:bg-red-600"}`}>
                                        {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}{cameraOn ? "Turn camera off" : "Turn camera on"}
                                    </button>
                                    <button type="button" onClick={() => void toggleScreenShare()} className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold hover:bg-blue-600">
                                        {sharingScreen ? <MonitorOff size={16} /> : <MonitorUp size={16} />}{sharingScreen ? "Stop sharing" : "Share screen"}
                                    </button>
                                </div>
                                <p className="mt-3 text-xs text-gray-500">Allow camera and microphone permissions. Screen sharing requires localhost or HTTPS.</p>
                            </div>

                            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                                <h3 className="mb-4 font-semibold">Playback controls</h3>

                                <p className="mb-3 text-sm text-gray-400">
                                    {isHost
                                        ? "As host, you can broadcast playback state."
                                        : "Only the host can control synchronized playback."}
                                </p>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={() => updatePlayback(true)}
                                        disabled={!isHost}
                                        className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 hover:bg-green-600 disabled:opacity-40"
                                    >
                                        <Play size={16} />
                                        Play
                                    </button>

                                    <button
                                        onClick={() => updatePlayback(false)}
                                        disabled={!isHost}
                                        className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600 disabled:opacity-40"
                                    >
                                        Pause
                                    </button>

                                    <span className="text-sm text-gray-400">
                                        State: {playback.isPlaying ? "Playing" : "Paused"}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                                    <Users size={18} />
                                    Participants ({participants.length})
                                </h3>

                                <ul className="space-y-3">
                                    {participants.map((participant) => (
                                        <li
                                            key={participant.id}
                                            className="flex items-center justify-between rounded-lg bg-gray-950 p-3"
                                        >
                                            <span>{participant.name}</span>
                                            {participant.isHost && (
                                                <span className="rounded-full bg-red-900 px-2 py-1 text-xs text-red-200">
                                                    Host
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        <aside className="flex min-h-[520px] flex-col rounded-2xl border border-gray-800 bg-gray-900">
                            <div className="flex items-center gap-2 border-b border-gray-800 p-4">
                                <MessageCircle size={20} />
                                <h3 className="font-semibold">Live chat</h3>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                                {messages.length === 0 && (
                                    <p className="text-sm text-gray-500">
                                        No messages yet. Say hello!
                                    </p>
                                )}

                                {messages.map((chatMessage) => (
                                    <div key={chatMessage.id} className="break-words">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="text-sm font-semibold text-red-300">
                                                {chatMessage.userName}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(chatMessage.createdAt).toLocaleTimeString(
                                                    [],
                                                    { hour: "2-digit", minute: "2-digit" }
                                                )}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-200">
                                            {chatMessage.message}
                                        </p>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            <form
                                onSubmit={sendMessage}
                                className="flex gap-2 border-t border-gray-800 p-3"
                            >
                                <input
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    maxLength={1000}
                                    placeholder="Type a message..."
                                    className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-red-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!message.trim()}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-40"
                                >
                                    Send
                                </button>
                            </form>
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}


function RemoteVideoTile({ stream, participantName }: { stream: MediaStream; participantName: string }) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        return () => {
            if (videoRef.current) videoRef.current.srcObject = null;
        };
    }, [stream]);
    return (
        <div className="overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} autoPlay playsInline className="aspect-video w-full object-cover" />
            <p className="px-3 py-2 text-xs text-gray-300">{participantName}</p>
        </div>
    );
}
