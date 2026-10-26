"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, ThumbsUp, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

export default function LikedContent() {
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useUser();

  useEffect(() => {
    if (user?._id) {
      loadLikedVideos();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadLikedVideos = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);

      const response = await axiosInstance.get(
        `/like/${user._id}`
      );

      setLikedVideos(response.data || []);
    } catch (error) {
      console.error("Error loading liked videos:", error);
      setLikedVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlikeVideo = async (
    videoId: string,
    likedVideoId: string
  ) => {
    if (!user?._id) return;

    try {
      await axiosInstance.post(`/like/${videoId}`, {
        userId: user._id,
      });

      setLikedVideos((prev) =>
        prev.filter((item) => item._id !== likedVideoId)
      );
    } catch (error) {
      console.error("Error unliking video:", error);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Loading liked videos...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <ThumbsUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />

        <h2 className="text-xl font-semibold mb-2">
          Keep track of videos you like
        </h2>

        <p className="text-gray-600">
          Sign in to see your liked videos.
        </p>
      </div>
    );
  }

  if (likedVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <ThumbsUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />

        <h2 className="text-xl font-semibold mb-2">
          No liked videos yet
        </h2>

        <p className="text-gray-600">
          Videos you like will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {likedVideos.length}{" "}
          {likedVideos.length === 1 ? "video" : "videos"}
        </p>

        <Button className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          Play all
        </Button>
      </div>

      {/* Liked Videos */}
      <div className="space-y-4">

        {likedVideos.map((item) => {

          const video = item.videoid;

          if (!video) {
            return null;
          }

          return (
            <div
              key={item._id}
              className="flex gap-4 group"
            >

              {/* Thumbnail */}
              <Link
                href={`/watch/${video._id}`}
                className="flex-shrink-0"
              >
                <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">

                  <video
                    src={
                      video.filepath
                        ? `http://localhost:5000/${video.filepath.replace(
                            /\\/g,
                            "/"
                          )}`
                        : ""
                    }
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    muted
                    preload="metadata"
                  />

                </div>
              </Link>

              {/* Video information */}
              <div className="flex-1 min-w-0">

                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                    {video.videotitle || "Untitled Video"}
                  </h3>
                </Link>

                <p className="text-sm text-gray-600">
                  {video.videochanel || "Unknown Channel"}
                </p>

                <p className="text-sm text-gray-600">
                  {(video.views || 0).toLocaleString()} views{" "}
                  •{" "}
                  {video.createdAt
                    ? formatDistanceToNow(
                        new Date(video.createdAt),
                        {
                          addSuffix: true,
                        }
                      )
                    : "Recently"}
                </p>

                {item.createdAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Liked{" "}
                    {formatDistanceToNow(
                      new Date(item.createdAt),
                      {
                        addSuffix: true,
                      }
                    )}
                  </p>
                )}

              </div>

              {/* Menu */}
              <DropdownMenu>

                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">

                  <DropdownMenuItem
                    onClick={() =>
                      handleUnlikeVideo(
                        video._id,
                        item._id
                      )
                    }
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove from liked videos
                  </DropdownMenuItem>

                </DropdownMenuContent>

              </DropdownMenu>

            </div>
          );
        })}

      </div>
    </div>
  );
}