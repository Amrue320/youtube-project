import React, { useCallback, useEffect, useMemo, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

type SortOption = "newest" | "oldest" | "mostViewed" | "leastViewed";

interface VideogridProps {
  selectedCategory: string;
}

interface VideoItem {
  _id: string;
  category?: string;
  createdAt?: string;
  views?: number;
  [key: string]: any;
}

const Videogrid = ({ selectedCategory }: VideogridProps) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axiosInstance.get("/video/getall");
      const data = res.data;

      const videoList: VideoItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.videos)
        ? data.videos
        : [];

      setVideos(videoList);
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError("Unable to load videos. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVideos();
  }, [fetchVideos]);

  const filteredVideos = useMemo(() => {
    if (selectedCategory === "All") return videos;

    return videos.filter(
      (video) =>
        video.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [videos, selectedCategory]);

  const sortedVideos = useMemo(() => {
    const sorted = [...filteredVideos];

    switch (sortOption) {
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        );
      case "oldest":
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime()
        );
      case "mostViewed":
        return sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      case "leastViewed":
        return sorted.sort((a, b) => (a.views ?? 0) - (b.views ?? 0));
      default:
        return sorted;
    }
  }, [filteredVideos, sortOption]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-lg font-medium text-foreground">
        Loading videos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => void fetchVideos()}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          {selectedCategory === "All"
            ? `Total Videos: ${ videos.length } `
            : `${ selectedCategory } Videos: ${ filteredVideos.length } `}
        </h2>

        <div className="flex items-center gap-2">
          <select
            value={sortOption}
            onChange={(event) =>
              setSortOption(event.target.value as SortOption)
            }
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            aria-label="Sort videos"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="mostViewed">Most Viewed</option>
            <option value="leastViewed">Least Viewed</option>
          </select>

          <button
            onClick={() => void fetchVideos()}
            className="rounded bg-primary px-4 py-2 text-primary-foreground transition hover:opacity-90"
          >
            Refresh Videos
          </button>
        </div>
      </div>

      {sortedVideos.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">
            No videos found in{" "}
            <span className="font-semibold">{selectedCategory}</span>.
          </p>
          <button
            onClick={() => void fetchVideos()}
            className="rounded bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
          >
            Refresh Videos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedVideos.map((video) => (
            <Videocard key={video._id} video={video} />
          ))}
        </div>
      )}
    </>
  );
};

export default Videogrid;