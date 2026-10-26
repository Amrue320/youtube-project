"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Camera, CameraOff, Mic, MicOff, MonitorUp, PhoneOff, ScreenShare, Video } from "lucide-react";

type SignalMessage = {
    roomId: string;
    from: string;
    description?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
};

type Participant = { id: string; name?: string; isHost?: boolean };

type PeerView = { id: string; stream: MediaStream };

type Props = {
    socket: Socket | null;
    roomId: string;
    userName: string;
    participants: Participant[];
};

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

export default function WatchPartyCall({ socket, roomId, userName, participants }: Props) {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const streamsRef = useRef<Map<string, MediaStream>>(new Map());
    const [peerViews, setPeerViews] = useState<PeerView[]>([]);
    const [inCall, setInCall] = useState(false);
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [sharingScreen, setSharingScreen] = useState(false);
    const [callStatus, setCallStatus] = useState("Not in call");
    const [error, setError] = useState("");

    const refreshPeerViews = useCallback(() => {
        setPeerViews(Array.from(streamsRef.current.entries()).map(([id, stream]) => ({ id, stream })));
    }, []);

    const sendSignal = useCallback((to: string, data: Omit<SignalMessage, "roomId" | "from">) => {
        if (!socket || !roomId) return;
        socket.emit("watch-party:signal", { roomId, to, ...data });
    }, [socket, roomId]);

    const closePeer = useCallback((peerId: string) => {
        const peer = peersRef.current.get(peerId);
        if (peer) {
            peer.onicecandidate = null;
            peer.ontrack = null;
            peer.onconnectionstatechange = null;
            peer.close();
            peersRef.current.delete(peerId);
        }
        streamsRef.current.delete(peerId);
        refreshPeerViews();
    }, [refreshPeerViews]);

    const createPeer = useCallback((peerId: string) => {
        const existing = peersRef.current.get(peerId);
        if (existing) return existing;
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peersRef.current.set(peerId, pc);

        const stream = new MediaStream();
        streamsRef.current.set(peerId, stream);
        pc.ontrack = (event) => {
            const incoming = event.streams[0];
            if (incoming) {
                incoming.getTracks().forEach((track) => {
                    if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) stream.addTrack(track);
                });
            } else if (!stream.getTracks().some((track) => track.id === event.track.id)) {
                stream.addTrack(event.track);
            }
            refreshPeerViews();
        };
        pc.onicecandidate = (event) => {
            if (event.candidate) sendSignal(peerId, { candidate: event.candidate.toJSON() });
        };
        pc.onconnectionstatechange = () => {
            if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
                if (pc.connectionState !== "disconnected") closePeer(peerId);
            }
        };
        localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
        screenStreamRef.current?.getTracks().forEach((track) => {
            if (track.kind === "video") pc.addTrack(track, screenStreamRef.current!);
        });
        return pc;
    }, [closePeer, refreshPeerViews, sendSignal]);

    const startCall = useCallback(async () => {
        if (!socket || !roomId || inCall) return;
        setError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            setMicEnabled(stream.getAudioTracks().some((track) => track.enabled));
            setCameraEnabled(stream.getVideoTracks().some((track) => track.enabled));
            setInCall(true);
            setCallStatus("Connecting call…");
            socket.emit("watch-party:call-ready", { roomId });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Camera/microphone access was denied.";
            setError(`${message} Allow camera and microphone permissions, then try again.`);
            setCallStatus("Could not access camera/microphone");
        }
    }, [socket, roomId, inCall]);

    useEffect(() => {
        if (!socket || !roomId || !inCall || !localStreamRef.current) return;
        const myId = socket.id;
        if (!myId) return;

        // A deterministic initiator avoids both peers creating offers simultaneously.
        participants.forEach((participant) => {
            if (!participant.id || participant.id === myId || peersRef.current.has(participant.id)) return;
            if (myId.localeCompare(participant.id) < 0) {
                const pc = createPeer(participant.id);
                void pc.createOffer().then((offer) => pc.setLocalDescription(offer)).then(() => {
                    if (pc.localDescription) sendSignal(participant.id, { description: pc.localDescription.toJSON() });
                }).catch((e) => setError(e instanceof Error ? e.message : "Could not start peer connection."));
            }
        });
    }, [participants, socket, roomId, inCall, createPeer, sendSignal]);

    useEffect(() => {
        if (!socket || !roomId) return;
        const onSignal = async (message: SignalMessage) => {
            if (message.roomId !== roomId || message.from === socket.id) return;
            const pc = peersRef.current.get(message.from) || (inCall ? createPeer(message.from) : undefined);
            if (!pc) return;
            try {
                if (message.description) {
                    await pc.setRemoteDescription(new RTCSessionDescription(message.description));
                    if (message.description.type === "offer") {
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        if (pc.localDescription) sendSignal(message.from, { description: pc.localDescription.toJSON() });
                    }
                }
                if (message.candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                }
            } catch (e) {
                setError(e instanceof Error ? `Call connection error: ${e.message}` : "Call connection error.");
            }
        };
        const onCallReady = ({ participantId }: { participantId: string }) => {
            if (!inCall || !participantId || participantId === socket.id || !socket.id) return;
            if (socket.id.localeCompare(participantId) < 0 && !peersRef.current.has(participantId)) {
                const pc = createPeer(participantId);
                void pc.createOffer().then((offer) => pc.setLocalDescription(offer)).then(() => {
                    if (pc.localDescription) sendSignal(participantId, { description: pc.localDescription.toJSON() });
                }).catch((e) => setError(e instanceof Error ? e.message : "Could not create call offer."));
            }
        };
        const onCallLeft = ({ participantId }: { participantId: string }) => {
            if (participantId) closePeer(participantId);
        };
        socket.on("watch-party:signal", onSignal);
        socket.on("watch-party:call-ready", onCallReady);
        socket.on("watch-party:call-left", onCallLeft);
        return () => {
            socket.off("watch-party:signal", onSignal);
            socket.off("watch-party:call-ready", onCallReady);
            socket.off("watch-party:call-left", onCallLeft);
        };
    }, [socket, roomId, inCall, createPeer, sendSignal, closePeer]);

    const toggleMic = () => {
        const next = !micEnabled;
        localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
        setMicEnabled(next);
    };

    const toggleCamera = () => {
        const next = !cameraEnabled;
        localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
        setCameraEnabled(next);
    };

    const stopScreenShare = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        peersRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((item) => item.track?.kind === "video");
            if (sender && cameraTrack) void sender.replaceTrack(cameraTrack);
        });
        setSharingScreen(false);
        if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    }, []);

    const startScreenShare = async () => {
        try {
            const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            const track = display.getVideoTracks()[0];
            screenStreamRef.current = display;
            peersRef.current.forEach((pc) => {
                const sender = pc.getSenders().find((item) => item.track?.kind === "video");
                if (sender) void sender.replaceTrack(track);
            });
            if (localVideoRef.current) localVideoRef.current.srcObject = display;
            track.onended = stopScreenShare;
            setSharingScreen(true);
            setError("");
        } catch (e) {
            setError(e instanceof Error ? `Screen sharing failed: ${e.message}` : "Screen sharing was cancelled or unavailable.");
        }
    };

    const leaveCall = useCallback(() => {
        stopScreenShare();
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();
        streamsRef.current.clear();
        refreshPeerViews();
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        socket?.emit("watch-party:call-leave", { roomId });
        setInCall(false);
        setMicEnabled(true);
        setCameraEnabled(true);
        setCallStatus("Call ended");
    }, [socket, roomId, stopScreenShare, refreshPeerViews]);

    useEffect(() => () => {
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    }, []);

    return (
        <section className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold"><Video size={19} /> Video call</h3>
                    <p className="mt-1 text-sm text-gray-400">{callStatus}{userName ? ` · ${userName}` : ""}</p>
                </div>
                {!inCall ? <button onClick={startCall} disabled={!socket?.connected || !roomId} className="rounded-lg bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 disabled:opacity-50">Join call</button> : null}
            </div>

            {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-200">{error}</p>}

            {inCall && <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                        <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                        <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs">You {sharingScreen ? "· Sharing screen" : "· Camera"}</span>
                    </div>
                    {peerViews.map((peer) => <RemoteVideo key={peer.id} peer={peer} />)}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={toggleMic} className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 hover:bg-gray-800">{micEnabled ? <Mic size={17} /> : <MicOff size={17} />}{micEnabled ? "Mute mic" : "Unmute mic"}</button>
                    <button onClick={toggleCamera} className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 hover:bg-gray-800">{cameraEnabled ? <Camera size={17} /> : <CameraOff size={17} />}{cameraEnabled ? "Camera off" : "Camera on"}</button>
                    {!sharingScreen ? <button onClick={startScreenShare} className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 hover:bg-gray-800"><MonitorUp size={17} />Share screen</button> : <button onClick={stopScreenShare} className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 hover:bg-gray-800"><ScreenShare size={17} />Stop sharing</button>}
                    <button onClick={leaveCall} className="flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 hover:bg-red-600"><PhoneOff size={17} />Leave call</button>
                </div>
            </>}
            <p className="text-xs text-gray-500">For local development, camera and microphone access works on localhost. For deployed sites, HTTPS is required. Network restrictions may require a TURN server for reliable connections.</p>
        </section>
    );
}

function RemoteVideo({ peer }: { peer: PeerView }) {
    const ref = useRef<HTMLVideoElement | null>(null);
    useEffect(() => { if (ref.current) ref.current.srcObject = peer.stream; }, [peer.stream]);
    return <div className="relative aspect-video overflow-hidden rounded-xl bg-black"><video ref={ref} autoPlay playsInline className="h-full w-full object-cover" /><span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs">Participant {peer.id.slice(0, 6)}</span></div>;
}
