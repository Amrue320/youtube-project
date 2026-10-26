"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  MoreVertical,
  X,
  Clock,
  Trash2,
  Play,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function HistoryContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { user } = useUser();

  useEffect(() => {
    if (user?._id) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [user?._id]);

  const loadHistory = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);

      const res = await axiosInstance.get(`/history/${user._id}`);

      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Load history error:", error);
      toast.error("Failed to load watch history");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      setRemovingId(historyId);

      /*
       * We will connect this to the backend DELETE API
       * after checking your existing history controller.
       */
      await axiosInstance.delete(`/history/${historyId}`);

      setHistory((prev) =>
        prev.filter((item) => item._id !== historyId)
      );

      toast.success("Removed from watch history");
    } catch (error) {
      console.error("Remove history error:", error);
      toast.error("Failed to remove from history");
    } finally {
      setRemovingId(null);
    }
  };

  const handleClearHistory = async () => {
    if (!user?._id || history.length === 0) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear your entire watch history?"
    );

    if (!confirmed) return;

    try {
      setClearing(true);

      await axiosInstance.delete(`/history/user/${user._id}`);

      setHistory([]);

      toast.success("Watch history cleared");
    } catch (error) {
      console.error("Clear history error:", error);
      toast.error("Failed to clear watch history");
    } finally {
      setClearing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || !Number.isFinite(seconds)) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mb-4" />

        <p className="text-muted-foreground">
          Loading watch history...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />

        <h2 className="text-xl font-semibold mb-2">
          Keep track of what you watch
        </h2>

        <p className="text-muted-foreground">
          Watch history isn't available while signed out.
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />

        <h2 className="text-xl font-semibold mb-2">
          No watch history yet
        </h2>

        <p className="text-muted-foreground mb-6">
          Videos you watch will appear here.
        </p>

        <Link href="/">
          <Button>
            <Play className="w-4 h-4 mr-2" />
            Browse Videos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {history.length}{" "}
            {history.length === 1 ? "video" : "videos"} watched
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearHistory}
          disabled={clearing}
        >
          <Trash2 className="w-4 h-4 mr-2" />

          {clearing ? "Clearing..." : "Clear All"}
        </Button>
      </div>

      {/* History List */}
      <div className="space-y-4">

        {history.map((item) => {
          const video = item.videoid;

          if (!video) {
            return null;
          }

          const videoUrl = video.filepath
            ? `http://localhost:5000/${video.filepath.replace(
                /\\/g,
                "/"
              )}`
            : "";

          return (
            <div
              key={item._id}
              className="flex gap-4 group p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >

              {/* Thumbnail */}
              <Link
                href={`/watch/${video._id}`}
                className="flex-shrink-0"
              >
                <div className="relative w-48 aspect-video bg-muted rounded-lg overflow-hidden">

                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-3">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>

                </div>
              </Link>

              {/* Video Information */}
              <div className="flex-1 min-w-0">

                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-semibold text-base line-clamp-2 hover:text-primary transition-colors">
                    {video.videotitle || "Untitled Video"}
                  </h3>
                </Link>

                <p className="text-sm text-muted-foreground mt-2">
                  {video.videochanel || "Unknown Channel"}
                </p>

                <p className="text-sm text-muted-foreground mt-1">
                  {(video.views || 0).toLocaleString()} views
                </p>

                {/* Watched time */}
                {item.createdAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Watched{" "}
                    {formatDistanceToNow(
                      new Date(item.createdAt),
                      {
                        addSuffix: true,
                      }
                    )}
                  </p>
                )}

              </div>

              {/* Options */}
              <div className="flex-shrink-0">

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={removingId === item._id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">

                    <DropdownMenuItem
                      onClick={() =>
                        handleRemoveFromHistory(item._id)
                      }
                    >
                      <X className="w-4 h-4 mr-2" />

                      Remove from watch history
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href={`/watch/${video._id}`}>
                        <Play className="w-4 h-4 mr-2" />

                        Watch video
                      </Link>
                    </DropdownMenuItem>

                  </DropdownMenuContent>
                </DropdownMenu>

              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}