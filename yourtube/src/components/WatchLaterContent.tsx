"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock, Play } from "lucide-react";
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

export default function WatchLaterContent() {
  const [watchLater, setWatchLater] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user?._id) {
      loadWatchLater();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadWatchLater = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(`/watch/${user?._id}`);

      setWatchLater(res.data);
    } catch (error) {
      toast.error("Failed to load Watch Later");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWatchLater = async (
    watchLaterId: string
  ) => {
    try {
      // Uncomment if backend delete API exists
      // await axiosInstance.delete(`/watch/${watchLaterId}`);

      setWatchLater((prev) =>
        prev.filter((item) => item._id !== watchLaterId)
      );

      toast.success("Removed from Watch Later");
    } catch (error) {
      toast.error("Failed to remove video");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-foreground">
        Loading Watch Later...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12 text-foreground">
        <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />

        <h2 className="text-xl font-semibold mb-2">
          Save videos for later
        </h2>

        <p className="text-muted-foreground">
          Sign in to access your Watch Later playlist.
        </p>
      </div>
    );
  }

  if (watchLater.length === 0) {
    return (
      <div className="text-center py-12 text-foreground">
        <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />

        <h2 className="text-xl font-semibold mb-2">
          No videos saved
        </h2>

        <p className="text-muted-foreground">
          Videos you save for later will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {watchLater.length} videos
        </p>

        <Button className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          Play all
        </Button>
      </div>

      <div className="space-y-4">

        {watchLater.map((item) => {
          const videoUrl = item.videoid?.filepath
            ? `http://localhost:5000/${item.videoid.filepath.replace(
              /\\/g,
              "/"
            )}`
            : "";

          return (
            <div
              key={item._id}
              className="flex gap-4 group"
            >

              <Link
                href={`/watch/${item.videoid?._id}`}
                className="flex-shrink-0"
              >
                <div className="relative w-40 aspect-video bg-muted rounded overflow-hidden">

                  <video
                    src={videoUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted
                    preload="metadata"
                  />

                </div>
              </Link>

              <div className="flex-1 min-w-0">

                <Link href={`/watch/${item.videoid?._id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary">
                    {item.videoid?.videotitle}
                  </h3>
                </Link>

                <p className="text-sm text-muted-foreground mt-1">
                  {item.videoid?.videochanel}
                </p>

                <p className="text-sm text-muted-foreground">
                  {(item.videoid?.views || 0).toLocaleString()} views •{" "}
                  {item.videoid?.createdAt
                    ? formatDistanceToNow(
                      new Date(item.videoid.createdAt),
                      { addSuffix: true }
                    )
                    : ""}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Added{" "}
                  {formatDistanceToNow(
                    new Date(item.createdAt),
                    { addSuffix: true }
                  )}
                </p>

              </div>

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
                      handleRemoveFromWatchLater(item._id)
                    }
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove from Watch Later
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