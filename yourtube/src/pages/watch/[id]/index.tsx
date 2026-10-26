"use client";

import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";

const Index = () => {
  const router = useRouter();
  const { id } = router.query;

  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all videos and find the current video
  useEffect(() => {
    const fetchVideo = async () => {
      if (!router.isReady || !id || typeof id !== "string") {
        return;
      }

      try {
        setLoading(true);

        const res = await axiosInstance.get("/video/getall");
        const videos = Array.isArray(res.data) ? res.data : [];

        const currentVideo = videos.find(
          (video: any) => video._id === id
        );

        setSelectedVideo(currentVideo ?? null);
        setAllVideos(videos);
      } catch (error) {
        console.error("Fetch video error:", error);
        setSelectedVideo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id, router.isReady]);

  // Create smart recommendations
  const recommendedVideos = useMemo(() => {
    if (!selectedVideo) {
      return [];
    }

    const currentVideoId = selectedVideo._id;
    const currentCategory = selectedVideo.category;

    // Same-category videos first
    const sameCategoryVideos = allVideos.filter(
      (video: any) =>
        video._id !== currentVideoId &&
        video.category === currentCategory
    );

    // Sort by views, then newest
    const sortedCategoryVideos = [...sameCategoryVideos].sort(
      (a: any, b: any) => {
        const viewDifference = (b.views ?? 0) - (a.views ?? 0);

        if (viewDifference !== 0) {
          return viewDifference;
        }

        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }
    );

    const recommendations = sortedCategoryVideos.slice(0, 8);

    // Fill remaining slots with popular videos from other categories
    if (recommendations.length < 8) {
      const fallbackVideos = allVideos
        .filter(
          (video: any) =>
            video._id !== currentVideoId &&
            video.category !== currentCategory
        )
        .sort(
          (a: any, b: any) => (b.views ?? 0) - (a.views ?? 0)
        );

      for (const video of fallbackVideos) {
        if (recommendations.length >= 8) {
          break;
        }

        recommendations.push(video);
      }
    }

    return recommendations;
  }, [selectedVideo, allVideos]);

  // Navigate to the next recommended video
  const handleNextVideo = () => {
    const nextVideo = recommendedVideos[0];

    if (!nextVideo?._id) {
      return;
    }

    router.push({
      pathname: router.pathname,
      query: {
        ...router.query,
        id: nextVideo._id,
      },
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-lg">Loading video...</p>
      </div>
    );
  }

  // Video not found
  if (!selectedVideo) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-500">Video not found</p>

          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Section */}
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer
              video={selectedVideo}
              nextVideo={recommendedVideos[0] ?? null}
              onNextVideo={handleNextVideo}
            />

            <VideoInfo video={selectedVideo} />

            <Comments videoId={id} />
          </div>

          {/* Related Videos */}
          <div className="space-y-4">
            <RelatedVideos videos={recommendedVideos} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;