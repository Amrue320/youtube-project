"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Clock, ListPlus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface Playlist {
  _id: string;
  name: string;
  description?: string;
  videos?: any[];
}

export default function VideoCard({ video }: any) {
  const { user } = useUser();

  const [duration, setDuration] = useState("");
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [checkingWatchLater, setCheckingWatchLater] =
    useState(false);

  const [showPlaylistMenu, setShowPlaylistMenu] =
    useState(false);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] =
    useState(false);

  const [addingToPlaylist, setAddingToPlaylist] =
    useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUrl = video?.filepath
    ? `http://localhost:5000/${video.filepath.replace(
      /\\/g,
      "/"
    )}`
    : "";

  // ================= FORMAT DURATION =================

  const formatDuration = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) {
      return "0:00";
    }

    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor(
      (seconds % 3600) / 60
    );

    const remainingSeconds = Math.floor(
      seconds % 60
    );

    if (hours > 0) {
      return `${hours}:${minutes
        .toString()
        .padStart(2, "0")}:${remainingSeconds
          .toString()
          .padStart(2, "0")}`;
    }

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // ================= VIDEO DURATION =================

  useEffect(() => {
    if (!videoUrl) return;

    const videoElement =
      document.createElement("video");

    videoElement.preload = "metadata";
    videoElement.src = videoUrl;

    const handleMetadata = () => {
      setDuration(
        formatDuration(videoElement.duration)
      );
    };

    videoElement.addEventListener(
      "loadedmetadata",
      handleMetadata
    );

    return () => {
      videoElement.removeEventListener(
        "loadedmetadata",
        handleMetadata
      );

      videoElement.src = "";
    };
  }, [videoUrl]);

  // ================= WATCH LATER STATUS =================

  useEffect(() => {
    const checkWatchLater = async () => {
      if (!user?._id || !video?._id) {
        setIsWatchLater(false);
        return;
      }

      try {
        setCheckingWatchLater(true);

        const res = await axiosInstance.get(
          `/watch/check/${video._id}/${user._id}`
        );

        setIsWatchLater(
          Boolean(res.data.watchlater)
        );
      } catch (error) {
        console.error(
          "Check Watch Later error:",
          error
        );

        setIsWatchLater(false);
      } finally {
        setCheckingWatchLater(false);
      }
    };

    checkWatchLater();
  }, [user?._id, video?._id]);

  // ================= PLAYLISTS =================

  const fetchPlaylists = async () => {
    if (!user?._id) {
      toast.error(
        "Please sign in to use playlists."
      );
      return;
    }

    try {
      setLoadingPlaylists(true);

      const response = await axiosInstance.get(
        `/playlist/user/${user._id}`
      );

      setPlaylists(
        response.data.playlists || []
      );
    } catch (error) {
      console.error(
        "Error fetching playlists:",
        error
      );

      toast.error(
        "Unable to load your playlists."
      );
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // ================= OPEN PLAYLIST MENU =================

  const handlePlaylistMenu = async (
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?._id) {
      toast.error(
        "Please sign in to use playlists."
      );
      return;
    }

    if (!video?._id) {
      toast.error(
        "Video information is missing."
      );
      return;
    }

    setShowPlaylistMenu(
      (previous) => !previous
    );

    if (!showPlaylistMenu) {
      await fetchPlaylists();
    }
  };

  // ================= ADD VIDEO TO PLAYLIST =================

  const addToPlaylist = async (
    e: React.MouseEvent,
    playlistId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!video?._id) return;

    try {
      setAddingToPlaylist(true);

      await axiosInstance.post(
        `/playlist/${playlistId}/video`,
        {
          videoId: video._id,
        }
      );

      const selectedPlaylist =
        playlists.find(
          (playlist) =>
            playlist._id === playlistId
        );

      toast.success(
        `Added to ${selectedPlaylist?.name ||
        "playlist"
        }`
      );

      setShowPlaylistMenu(false);
    } catch (error: any) {
      console.error(
        "Add to playlist error:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
        "Unable to add video to playlist."
      );
    } finally {
      setAddingToPlaylist(false);
    }
  };

  // ================= CREATE NEW PLAYLIST =================

  const createNewPlaylist = async (
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?._id) {
      toast.error(
        "Please sign in to create playlists."
      );
      return;
    }

    const playlistName = window.prompt(
      "Enter playlist name:"
    );

    if (!playlistName?.trim()) {
      return;
    }

    try {
      const response =
        await axiosInstance.post(
          "/playlist",
          {
            owner: user._id,
            name: playlistName.trim(),
            description: "",
          }
        );

      const newPlaylist =
        response.data.playlist;

      if (newPlaylist?._id && video?._id) {
        await axiosInstance.post(
          `/playlist/${newPlaylist._id}/video`,
          {
            videoId: video._id,
          }
        );
      }

      toast.success(
        `Created "${playlistName.trim()}" and added video`
      );

      setShowPlaylistMenu(false);
    } catch (error) {
      console.error(
        "Create playlist error:",
        error
      );

      toast.error(
        "Unable to create playlist."
      );
    }
  };

  // ================= MOUSE HOVER =================

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;

      videoRef.current
        .play()
        .catch(() => { });
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // ================= WATCH LATER =================

  const handleWatchLater = async (
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?._id) {
      toast.error(
        "Please sign in to use Watch Later."
      );
      return;
    }

    if (!video?._id) {
      toast.error(
        "Video information is missing."
      );
      return;
    }

    try {
      const res =
        await axiosInstance.post(
          `/watch/${video._id}`,
          {
            userId: user._id,
          }
        );

      if (res.data.watchlater) {
        setIsWatchLater(true);

        toast.success(
          "Added to Watch Later"
        );
      } else {
        setIsWatchLater(false);

        toast.success(
          "Removed from Watch Later"
        );
      }
    } catch (error) {
      console.error(
        "Watch Later error:",
        error
      );

      toast.error(
        "Unable to update Watch Later."
      );
    }
  };

  return (
    <Link
      href={`/watch/${video?._id}`}
      className="group block"
    >
      <div className="space-y-3">

        {/* ================= THUMBNAIL ================= */}

        <div
          className="relative aspect-video overflow-visible rounded-xl bg-muted"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="w-full h-full overflow-hidden rounded-xl">

            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              muted
              playsInline
              preload="metadata"
            />

          </div>

          {/* ================= ACTION BUTTONS ================= */}

          <div className="absolute top-2 right-2 flex gap-2">

            {/* WATCH LATER */}

            <Button
              type="button"
              onClick={handleWatchLater}
              disabled={checkingWatchLater}
              className={`h-9 w-9 rounded-full p-0 ${isWatchLater
                  ? "bg-primary text-primary-foreground"
                  : "bg-black/70 text-white hover:bg-black"
                }`}
              title={
                isWatchLater
                  ? "Remove from Watch Later"
                  : "Save to Watch Later"
              }
            >
              <Clock
                className={`h-4 w-4 ${isWatchLater
                    ? "fill-current"
                    : ""
                  }`}
              />
            </Button>

            {/* PLAYLIST */}

            <Button
              type="button"
              onClick={handlePlaylistMenu}
              className="h-9 w-9 rounded-full p-0 bg-black/70 text-white hover:bg-black"
              title="Save to playlist"
            >
              <ListPlus className="h-4 w-4" />
            </Button>

          </div>

          {/* ================= PLAYLIST MENU ================= */}

          {showPlaylistMenu && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="absolute top-12 right-2 z-50 w-64 rounded-xl border border-border bg-background shadow-xl p-3"
            >

              <div className="flex items-center justify-between mb-3">

                <h3 className="font-semibold text-sm">
                  Save to playlist
                </h3>

              </div>

              {loadingPlaylists ? (

                <p className="text-sm text-muted-foreground py-3">
                  Loading playlists...
                </p>

              ) : playlists.length === 0 ? (

                <div className="py-2">

                  <p className="text-sm text-muted-foreground mb-3">
                    You don't have any playlists yet.
                  </p>

                </div>

              ) : (

                <div className="max-h-48 overflow-y-auto space-y-1">

                  {playlists.map(
                    (playlist) => (
                      <button
                        key={playlist._id}
                        type="button"
                        disabled={addingToPlaylist}
                        onClick={(e) =>
                          addToPlaylist(
                            e,
                            playlist._id
                          )
                        }
                        className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition"
                      >
                        {playlist.name}
                      </button>
                    )
                  )}

                </div>

              )}

              {/* CREATE PLAYLIST */}

              <div className="border-t border-border mt-3 pt-3">

                <button
                  type="button"
                  onClick={createNewPlaylist}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent transition"
                >
                  <Plus className="h-4 w-4" />

                  Create new playlist
                </button>

              </div>

            </div>
          )}

          {/* ================= DURATION ================= */}

          {duration && (
            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-xs text-white">
              {duration}
            </span>
          )}

        </div>

        {/* ================= VIDEO DETAILS ================= */}

        <div className="flex gap-3">

          {/* CHANNEL AVATAR */}

          <Avatar className="h-10 w-10">

            <AvatarFallback>
              {video?.videochanel
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </AvatarFallback>

          </Avatar>

          {/* TITLE / INFO */}

          <div className="flex-1 overflow-hidden">

            <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
              {video?.videotitle ||
                "Untitled Video"}
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {video?.videochanel ||
                "Unknown Channel"}
            </p>

            <p className="text-sm text-muted-foreground">

              {(video?.views ?? 0).toLocaleString()}{" "}
              views •{" "}

              {video?.createdAt
                ? formatDistanceToNow(
                  new Date(
                    video.createdAt
                  ),
                  {
                    addSuffix: true,
                  }
                )
                : "Just now"}

            </p>

            {/* DESCRIPTION */}

            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {video?.description ||
                "No description has been added for this video."}
            </p>

          </div>

        </div>

      </div>
    </Link>
  );
}