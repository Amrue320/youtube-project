
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type TouchEvent,
} from "react";
import {
  Download,
  Gauge,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import type { Socket } from "socket.io-client";

interface Video {
  _id: string;
  title?: string;
  videotitle?: string;
  filepath?: string;
  videoUrl?: string;
}

interface WatchPartyPlayback {
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
}

interface VideoPlayerProps {
  video: Video;
  nextVideo?: Video | null;
  onNextVideo?: () => void;
  watchPartySocket?: Socket | null;
  watchPartyActive?: boolean;
  watchPartyHost?: boolean;
  watchPartyPlayback?: WatchPartyPlayback;
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const seconds = Math.floor(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default function Videopplayer({
  video,
  nextVideo,
  onNextVideo,
  watchPartySocket = null,
  watchPartyActive = false,
  watchPartyHost = false,
  watchPartyPlayback,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);
  const lastTapRef = useRef<{ time: number; side: string } | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRemotePlaybackRef = useRef(false);
  const lastBroadcastAtRef = useRef(0);

  const { user } = useUser();

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [gestureMessage, setGestureMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");

  const path = video?.videoUrl || video?.filepath || "";
  const src = path
    ? path.startsWith("http")
      ? path
      : `http://localhost:5000/${path
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")}`
    : "";

  useEffect(() => {
    viewedRef.current = false;
    setPlaying(false);
    setLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setVolume(1);
    setMuted(false);
    setSpeed(1);
    setDownloadMessage("");

    const player = videoRef.current;
    if (player) {
      player.volume = 1;
      player.muted = false;
      player.playbackRate = 1;
    }
  }, [video?._id]);

  // Synchronize this player with the Watch Party host.
  useEffect(() => {
    const player = videoRef.current;
    const socket = watchPartySocket;
    if (!player || !socket || !watchPartyActive) return;

    const applyPlayback = async (state: WatchPartyPlayback) => {
      applyingRemotePlaybackRef.current = true;
      try {
        if (Number.isFinite(state.currentTime) && Math.abs(player.currentTime - state.currentTime) > 1.5) {
          player.currentTime = Math.max(0, state.currentTime);
        }
        if (state.isPlaying && player.paused) {
          try { await player.play(); } catch (error) {
            console.warn("Browser blocked synchronized playback; press Play to start:", error);
          }
        } else if (!state.isPlaying && !player.paused) {
          player.pause();
        }
      } finally {
        window.setTimeout(() => { applyingRemotePlaybackRef.current = false; }, 250);
      }
    };

    const broadcastPlayback = (force = false) => {
      if (!watchPartyHost || applyingRemotePlaybackRef.current) return;
      const now = Date.now();
      if (!force && now - lastBroadcastAtRef.current < 2500) return;
      lastBroadcastAtRef.current = now;
      socket.emit("watch-party:playback", {
        isPlaying: !player.paused,
        currentTime: Number.isFinite(player.currentTime) ? player.currentTime : 0,
        updatedAt: now,
      });
    };

    const onPlay = () => broadcastPlayback(true);
    const onPause = () => broadcastPlayback(true);
    const onSeeked = () => broadcastPlayback(true);
    const onTimeUpdate = () => broadcastPlayback(false);
    const onRemotePlayback = (state: WatchPartyPlayback) => { void applyPlayback(state); };

    socket.on("watch-party:playback", onRemotePlayback);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("seeked", onSeeked);
    player.addEventListener("timeupdate", onTimeUpdate);

    // Apply the room's current state when a player first mounts or joins.
    if (watchPartyPlayback) void applyPlayback(watchPartyPlayback);

    return () => {
      socket.off("watch-party:playback", onRemotePlayback);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("seeked", onSeeked);
      player.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [watchPartySocket, watchPartyActive, watchPartyHost, watchPartyPlayback?.isPlaying, watchPartyPlayback?.currentTime, video?._id]);

  // Restore previously saved progress.
  useEffect(() => {
    const player = videoRef.current;
    if (!player || !video?._id || !user?._id) return;

    let cancelled = false;

    const restoreProgress = async () => {
      try {
        const response = await axiosInstance.get(
          `/progress/${user._id}/${video._id}`
        );

        const saved =
          response.data?.progress?.currentTime ??
          response.data?.currentTime ??
          response.data?.progress ??
          0;

        if (
          cancelled ||
          !videoRef.current ||
          !Number.isFinite(Number(saved)) ||
          Number(saved) <= 0
        ) {
          return;
        }

        const currentPlayer = videoRef.current;
        if (
          !Number.isFinite(currentPlayer.duration) ||
          Number(saved) < currentPlayer.duration - 2
        ) {
          currentPlayer.currentTime = Number(saved);
          setCurrentTime(Number(saved));
        }
      } catch (error) {
        console.error("Could not restore video progress:", error);
      }
    };

    player.addEventListener("loadedmetadata", restoreProgress);

    return () => {
      cancelled = true;
      player.removeEventListener("loadedmetadata", restoreProgress);
    };
  }, [video?._id, user?._id]);

  // Save progress every five seconds, on pause, and at the end.
  useEffect(() => {
    const player = videoRef.current;
    if (!player || !video?._id || !user?._id) return;

    const saveProgress = async () => {
      const currentPlayer = videoRef.current;
      if (!currentPlayer || !Number.isFinite(currentPlayer.currentTime)) {
        return;
      }

      try {
        await axiosInstance.post("/progress", {
          userId: user._id,
          videoId: video._id,
          currentTime: currentPlayer.currentTime,
          duration: Number.isFinite(currentPlayer.duration)
            ? currentPlayer.duration
            : 0,
        });
      } catch (error) {
        console.error("Could not save video progress:", error);
      }
    };

    const interval = window.setInterval(() => {
      if (!player.paused && !player.ended) void saveProgress();
    }, 5000);

    player.addEventListener("pause", saveProgress);
    player.addEventListener("ended", saveProgress);

    return () => {
      window.clearInterval(interval);
      player.removeEventListener("pause", saveProgress);
      player.removeEventListener("ended", saveProgress);
    };
  }, [video?._id, user?._id]);

  useEffect(() => {
    const updateFullscreen = () => {
      setFullscreen(
        document.fullscreenElement === containerRef.current
      );
    };

    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const player = videoRef.current;
    if (!player) return;

    if (player.paused) {
      try {
        await player.play();
      } catch (error) {
        console.error("Unable to play video:", error);
      }
    } else {
      player.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const player = videoRef.current;
    if (!player) return;

    const end = Number.isFinite(player.duration)
      ? player.duration
      : Infinity;

    player.currentTime = Math.max(
      0,
      Math.min(end, player.currentTime + seconds)
    );
    setCurrentTime(player.currentTime);
  }, []);

  const handleSpeed = (event: ChangeEvent<HTMLSelectElement>) => {
    const rate = Number(event.target.value);
    if (!SPEEDS.includes(rate)) return;

    setSpeed(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  const handleVolume = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);

    setVolume(value);
    setMuted(value === 0);

    if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0;
    }
  };

  const toggleMute = () => {
    const player = videoRef.current;
    if (!player) return;

    if (player.muted || muted) {
      const value = volume === 0 ? 1 : volume;
      player.volume = value;
      player.muted = false;
      setVolume(value);
      setMuted(false);
    } else {
      player.muted = true;
      setMuted(true);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else {
        const player = videoRef.current as
          | (HTMLVideoElement & {
            webkitEnterFullscreen?: () => void;
          })
          | null;

        player?.webkitEnterFullscreen?.();
      }
    } catch (error) {
      console.error("Unable to toggle fullscreen:", error);
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const side =
      touch.clientX < bounds.left + bounds.width / 2
        ? "left"
        : "right";
    const now = Date.now();
    const previous = lastTapRef.current;

    if (
      previous &&
      previous.side === side &&
      now - previous.time <= 280
    ) {
      lastTapRef.current = null;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

      seek(side === "right" ? 10 : -10);
      setGestureMessage(side === "right" ? "+10 seconds" : "−10 seconds");

      tapTimerRef.current = setTimeout(
        () => setGestureMessage(""),
        650
      );
      return;
    }

    lastTapRef.current = { time: now, side };

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      lastTapRef.current = null;
    }, 280);
  };

  const handlePlay = async () => {
    setPlaying(true);
    if (viewedRef.current) return;

    viewedRef.current = true;

    try {
      await axiosInstance.post(`/video/views/${video._id}`);
    } catch (error) {
      viewedRef.current = false;
      console.error("Could not update view count:", error);
    }
  };

  const handleDownload = async () => {
    if (!user?._id) {
      setDownloadMessage("Please sign in to download videos.");
      return;
    }

    if (!video?._id) {
      setDownloadMessage("Video information is unavailable.");
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadMessage("");

      const response = await axiosInstance.post(
        "/download",
        { videoId: video._id, userId: user._id },
        { responseType: "blob" }
      );

      const contentType = response.headers?.["content-type"] || "";

      if (
        contentType.includes("application/json") ||
        contentType.includes("application/problem+json")
      ) {
        const data =
          response.data instanceof Blob
            ? JSON.parse(await response.data.text())
            : response.data;

        setDownloadMessage(
          data?.message || "Unable to download video."
        );
        return;
      }

      if (
        !(response.data instanceof Blob) ||
        response.data.size === 0
      ) {
        setDownloadMessage("The downloaded video file is empty.");
        return;
      }

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      const safeTitle = (
        video.title ||
        video.videotitle ||
        "video"
      )
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .trim();

      link.href = blobUrl;
      link.download = `${safeTitle || "video"}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(
        () => window.URL.revokeObjectURL(blobUrl),
        1000
      );

      setDownloadMessage("Download started.");
    } catch (error: unknown) {
      console.error("Video download failed:", error);

      const err = error as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };

      const status = err.response?.status;
      let data: any = err.response?.data;

      if (data instanceof Blob) {
        try {
          data = JSON.parse(await data.text());
        } catch {
          data = null;
        }
      }

      if (status === 429) {
        setDownloadMessage(
          data?.message ||
          "Daily download limit reached. Try again tomorrow."
        );
      } else if (status === 401 || status === 403) {
        setDownloadMessage(
          data?.message ||
          "You are not authorized to download this video."
        );
      } else if (status === 404) {
        setDownloadMessage(
          data?.message ||
          "Video not found or unavailable for download."
        );
      } else {
        setDownloadMessage(
          data?.message ||
          err.message ||
          "Download failed. Please try again."
        );
      }
    } finally {
      setIsDownloading(false);
    }
  };

  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg bg-black text-white">
        Video source is unavailable.
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full space-y-3">
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-black ${fullscreen
            ? "flex h-screen items-center justify-center"
            : "aspect-video rounded-lg"
          }`}
      >
        <video
          key={video._id}
          ref={videoRef}
          src={src}
          autoPlay
          playsInline
          preload="metadata"
          controls={false}
          className={`h-full w-full bg-black object-contain ${fullscreen ? "max-h-screen" : "absolute inset-0"
            }`}
          onPlay={handlePlay}
          onPause={() => setPlaying(false)}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onPlaying={() => {
            setPlaying(true);
            setLoading(false);
          }}
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration;
            setDuration(Number.isFinite(value) ? value : 0);
            setLoading(false);
          }}
          onDurationChange={(event) => {
            const value = event.currentTarget.duration;
            setDuration(Number.isFinite(value) ? value : 0);
          }}
          onTimeUpdate={(event) =>
            setCurrentTime(event.currentTarget.currentTime)
          }
          onEnded={() => {
            setPlaying(false);
            if (nextVideo && onNextVideo) onNextVideo();
          }}
        />

        {/* Gesture overlay: the controls below sit above it. */}
        <div
          className="absolute inset-0 z-10 touch-pan-y"
          aria-label="Double-tap left to rewind or right to skip forward"
          onTouchEnd={handleTouchEnd}
          onDoubleClick={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            seek(
              event.clientX < bounds.left + bounds.width / 2
                ? -10
                : 10
            );
          }}
          onClick={(event) => {
            if (event.detail === 1) void togglePlay();
          }}
        />

        {loading && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/25">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"
              role="status"
              aria-label="Loading video"
            />
          </div>
        )}

        {gestureMessage && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/75 px-5 py-3 text-lg font-semibold text-white">
            {gestureMessage}
          </div>
        )}

        {/* Custom player controls */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10 text-white">
          <label htmlFor={`seek-${video._id}`} className="sr-only">
            Video progress
          </label>
          <input
            id={`seek-${video._id}`}
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || currentTime)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (videoRef.current) {
                videoRef.current.currentTime = value;
              }
              setCurrentTime(value);
            }}
            className="mb-2 block w-full cursor-pointer accent-red-500"
            style={{
              backgroundSize: `${progress}% 100%`,
            }}
            aria-label="Seek video"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => void togglePlay()}
                className="rounded p-2 hover:bg-white/15"
                aria-label={playing ? "Pause video" : "Play video"}
                title={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={21} /> : <Play size={21} />}
              </button>

              <button
                type="button"
                onClick={() => seek(-10)}
                className="rounded p-2 hover:bg-white/15"
                aria-label="Rewind 10 seconds"
                title="Rewind 10 seconds"
              >
                <RotateCcw size={20} />
              </button>

              <button
                type="button"
                onClick={() => seek(10)}
                className="rounded p-2 hover:bg-white/15"
                aria-label="Forward 10 seconds"
                title="Forward 10 seconds"
              >
                <RotateCw size={20} />
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="rounded p-2 hover:bg-white/15"
                aria-label={muted ? "Unmute video" : "Mute video"}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted || volume === 0 ? (
                  <VolumeX size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </button>

              <label htmlFor={`volume-${video._id}`} className="sr-only">
                Video volume
              </label>
              <input
                id={`volume-${video._id}`}
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolume}
                className="hidden w-20 cursor-pointer accent-white sm:block"
              />

              <span className="hidden text-xs tabular-nums sm:inline">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <Gauge size={18} />
              <label htmlFor={`speed-${video._id}`} className="sr-only">
                Playback speed
              </label>
              <select
                id={`speed-${video._id}`}
                value={speed}
                onChange={handleSpeed}
                className="rounded border border-white/30 bg-black/70 px-2 py-1 text-sm text-white"
                aria-label="Playback speed"
              >
                {SPEEDS.map((value) => (
                  <option key={value} value={value}>
                    {value}x
                  </option>
                ))}
              </select>

              {nextVideo && onNextVideo && (
                <button
                  type="button"
                  onClick={onNextVideo}
                  className="inline-flex items-center gap-1 rounded px-2 py-2 text-sm hover:bg-white/15"
                  title={`Next: ${nextVideo.videotitle || nextVideo.title || "recommended video"}`}
                  aria-label="Play next recommended video"
                >
                  Next <RotateCw size={17} />
                </button>
              )}

              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded p-2 hover:bg-white/15"
                aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
                title={fullscreen ? "Exit full screen" : "Full screen"}
              >
                <Maximize size={20} />
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Download video"
              >
                <Download size={17} />
                <span className="hidden sm:inline">
                  {isDownloading ? "Downloading..." : "Download"}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-1 text-xs tabular-nums sm:hidden">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      {downloadMessage && (
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {downloadMessage}
        </p>
      )}
    </div>
  );
}
