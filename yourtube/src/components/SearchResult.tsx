"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";

interface Video {
  _id: string;
  videotitle?: string;
  filepath?: string;
  videochanel?: string;
  uploader?: string;
  description?: string;
  views?: number;
  createdAt?: string;
  category?: string;
}

type SortOption = "relevance" | "latest" | "mostViewed";

const SearchResult = ({ query }: { query: string }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  useEffect(() => {
    let cancelled = false;

    const searchVideos = async () => {
      if (!query.trim()) {
        setVideos([]);
        setError("");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await axiosInstance.get("/video/getall");
        const data = response.data;

        const allVideos: Video[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.videos)
            ? data.videos
            : [];

        const searchQuery = query.trim().toLowerCase();

        const results = allVideos.filter((video) => {
          const title = video.videotitle?.toLowerCase() || "";
          const channel = video.videochanel?.toLowerCase() || "";
          const description = video.description?.toLowerCase() || "";

          return (
            title.includes(searchQuery) ||
            channel.includes(searchQuery) ||
            description.includes(searchQuery)
          );
        });

        if (!cancelled) {
          setVideos(results);
        }
      } catch (err) {
        console.error("Error searching videos:", err);

        if (!cancelled) {
          setVideos([]);
          setError("Unable to search videos. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void searchVideos();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const sortedVideos = useMemo(() => {
    const sorted = [...videos];
    const searchTerm = query.trim().toLowerCase();

    if (sortBy === "relevance") {
      const score = (video: Video) => {
        const title = video.videotitle?.toLowerCase() || "";
        const channel = video.videochanel?.toLowerCase() || "";
        const description = video.description?.toLowerCase() || "";

        let result = 0;

        if (title === searchTerm) result += 100;
        if (title.startsWith(searchTerm)) result += 50;
        if (title.includes(searchTerm)) result += 30;
        if (channel.includes(searchTerm)) result += 20;
        if (description.includes(searchTerm)) result += 10;

        return result;
      };

      return sorted.sort((a, b) => score(b) - score(a));
    }

    if (sortBy === "latest") {
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    }

    if (sortBy === "mostViewed") {
      return sorted.sort(
        (a, b) => (b.views ?? 0) - (a.views ?? 0)
      );
    }

    return sorted;
  }, [videos, sortBy, query]);

  const getVideoUrl = (filepath?: string) => {
    if (!filepath) return "";

    if (/^https?:\/\//i.test(filepath)) {
      return filepath;
    }

    const baseURL = axiosInstance.defaults.baseURL;

    if (!baseURL) return "";

    const normalizedPath = filepath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    return `${baseURL.replace(/\/+$/, "")}/${normalizedPath}`;
  };

  if (!query.trim()) {
    return (
      <div className="py-12 text-center text-foreground">
        <h2 className="mb-2 text-xl font-semibold">Enter a search term</h2>
        <p className="text-muted-foreground">
          Search for videos, channels, or topics.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-foreground">
        <p className="text-muted-foreground">Searching videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="py-12 text-center text-foreground">
        <h2 className="mb-2 text-xl font-semibold">No results found</h2>
        <p className="text-muted-foreground">
          Try different keywords or search for another channel or topic.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {sortedVideos.length}{" "}
          {sortedVideos.length === 1 ? "result" : "results"} for "{query}"
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={sortBy === "relevance" ? "default" : "secondary"}
            onClick={() => setSortBy("relevance")}
          >
            Relevance
          </Button>

          <Button
            size="sm"
            variant={sortBy === "latest" ? "default" : "secondary"}
            onClick={() => setSortBy("latest")}
          >
            Latest
          </Button>

          <Button
            size="sm"
            variant={sortBy === "mostViewed" ? "default" : "secondary"}
            onClick={() => setSortBy("mostViewed")}
          >
            Most Viewed
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {sortedVideos.map((video) => {
          const videoUrl = getVideoUrl(video.filepath);
          const date = video.createdAt
            ? new Date(video.createdAt)
            : null;

          const validDate =
            date && !Number.isNaN(date.getTime()) ? date : null;

          return (
            <div key={video._id} className="group flex gap-4">
              <Link
                href={`/watch/${video._id}`}
                className="w-40 flex-shrink-0 sm:w-80"
              >
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      Preview unavailable
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
                    Video
                  </div>
                </div>
              </Link>

              <div className="min-w-0 flex-1 py-1">
                <Link href={`/watch/${video._id}`}>
                  <h3 className="mb-2 line-clamp-2 text-lg font-medium group-hover:text-primary">
                    {video.videotitle || "Untitled Video"}
                  </h3>
                </Link>

                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{(video.views ?? 0).toLocaleString()} views</span>
                  <span>•</span>
                  <span>
                    {validDate
                      ? formatDistanceToNow(validDate, {
                        addSuffix: true,
                      })
                      : "Date unavailable"}
                  </span>
                </div>

                {video.uploader && (
                  <Link
                    href={`/channel/${video.uploader}`}
                    className="mb-2 flex items-center gap-2 hover:text-primary"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback className="text-xs">
                        {video.videochanel?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <span className="text-sm text-muted-foreground">
                      {video.videochanel || "Unknown Channel"}
                    </span>
                  </Link>
                )}

                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {video.description ||
                    "No description has been added for this video."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchResult;