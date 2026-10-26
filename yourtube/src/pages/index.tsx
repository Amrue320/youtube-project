"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Videocard from "@/components/videocard";
import axiosInstance from "@/lib/axiosinstance";

export default function SearchPage() {
  const router = useRouter();

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query =
    typeof router.query.q === "string"
      ? router.query.q
      : "";

  useEffect(() => {
    if (!router.isReady) return;

    const searchVideos = async () => {
      if (!query.trim()) {
        setVideos([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await axiosInstance.get(
          `/video/search?query=${encodeURIComponent(query)}`
        );

        setVideos(res.data);
      } catch (error) {
        console.error("Search error:", error);

        setError(
          "Unable to search videos. Please try again."
        );

        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    searchVideos();
  }, [router.isReady, query]);

  if (!router.isReady || loading) {
    return (
      <main className="flex-1 p-6">
        <div className="flex justify-center items-center h-40">
          <p className="text-lg text-muted-foreground">
            Searching...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 p-6">
        <div className="flex flex-col justify-center items-center h-40 gap-4">
          <p className="text-red-500">{error}</p>

          <button
            onClick={() => router.reload()}
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Search results
        </h1>

        {query && (
          <p className="mt-2 text-muted-foreground">
            Results for:{" "}
            <span className="font-medium text-foreground">
              "{query}"
            </span>
          </p>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-40">
          <p className="text-lg text-muted-foreground">
            No videos found.
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Try searching for another video, channel,
            category, or keyword.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {videos.length}{" "}
            {videos.length === 1 ? "video" : "videos"} found
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <Videocard
                key={video._id}
                video={video}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}