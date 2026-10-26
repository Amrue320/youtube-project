"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface RelatedVideo {
  _id: string;
  videotitle: string;
  videochanel: string;
  views?: number;
  createdAt?: string;
  filepath?: string;
}

interface RelatedVideosProps {
  videos: RelatedVideo[];
}

export default function RelatedVideos({
  videos,
}: RelatedVideosProps) {
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No related videos found.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-foreground">
      <h2 className="text-lg font-semibold">
        Related Videos
      </h2>

      {videos.map((video) => {
        const videoUrl = video.filepath
          ? `http://localhost:5000/${video.filepath.replace(
            /\\/g,
            "/"
          )}`
          : "";

        return (
          <Link
            key={video._id}
            href={`/watch/${video._id}`}
            className="flex gap-3 group"
          >
            {/* Thumbnail */}
            <div className="relative w-44 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  No thumbnail
                </div>
              )}
            </div>

            {/* Video Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {video.videotitle || "Untitled Video"}
              </h3>

              <p className="text-xs text-muted-foreground mt-1">
                {video.videochanel || "Unknown Channel"}
              </p>

              <p className="text-xs text-muted-foreground">
                {(video.views ?? 0).toLocaleString()} views
                {" • "}
                {video.createdAt
                  ? formatDistanceToNow(
                    new Date(video.createdAt),
                    {
                      addSuffix: true,
                    }
                  )
                  : "Just now"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}