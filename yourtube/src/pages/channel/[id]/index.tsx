import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

interface Channel {
  _id: string;
  name: string;
  channelname?: string;
  image?: string;
  description?: string;
  subscribers?: string[];
}

interface Video {
  _id: string;
  videotitle: string;
  filename: string;
  filepath: string;
  videochanel: string;
  uploader?: string;
  views?: number;
  Like?: number;
  category?: string;
  createdAt?: string;
}

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();

  const channelId = typeof id === "string" ? id : "";

  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState("");

  // Fetch channel details and its videos.
  const fetchChannel = useCallback(async () => {
    if (!router.isReady || !channelId) return;

    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.get(
        `/video/channel/${channelId}`
      );

      const data = response.data;

      if (!data?.success || !data?.channel) {
        throw new Error("Invalid channel response");
      }

      setChannel(data.channel);
      setVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch (err) {
      console.error("Channel fetch error:", err);
      setChannel(null);
      setVideos([]);
      setError("Unable to load channel. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router.isReady, channelId]);

  useEffect(() => {
    void fetchChannel();
  }, [fetchChannel]);

  // Check whether the current user is subscribed.
  useEffect(() => {
    if (!router.isReady || !channelId || !user?._id) return;

    if (user._id === channelId) {
      setSubscribed(false);
      return;
    }

    let cancelled = false;

    const checkSubscription = async () => {
      try {
        const response = await axiosInstance.get(
          `/user/checksubscription/${channelId}/${user._id}`
        );

        if (!cancelled) {
          setSubscribed(response.data?.subscribed === true);
        }
      } catch (err) {
        console.error("Subscription check error:", err);
      }
    };

    void checkSubscription();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, channelId, user?._id]);

  // Subscribe or unsubscribe.
  const handleSubscribe = async () => {
    if (!user?._id) {
      alert("Please sign in to subscribe.");
      return;
    }

    if (!channelId || user._id === channelId || subscribing) return;

    try {
      setSubscribing(true);

      const response = await axiosInstance.post(
        `/user/subscribe/${channelId}`,
        { userId: user._id }
      );

      if (typeof response.data?.subscribed !== "boolean") {
        throw new Error("Invalid subscription response");
      }

      const newSubscribed = response.data.subscribed;
      setSubscribed(newSubscribed);

      // Update the displayed subscriber count without duplicates.
      setChannel((previous) => {
        if (!previous) return previous;

        const current = previous.subscribers ?? [];
        const updated = newSubscribed
          ? current.includes(user._id)
            ? current
            : [...current, user._id]
          : current.filter((subscriberId) => subscriberId !== user._id);

        return { ...previous, subscribers: updated };
      });
    } catch (err) {
      console.error("Subscription error:", err);
      alert("Unable to update subscription. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const openVideo = (videoId: string) => {
    void router.push(`/watch/${videoId}`);
  };

  const formatDate = (date?: string) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatViews = (views = 0) => {
    if (views >= 1_000_000) {
      return `${(views / 1_000_000).toFixed(1)}M`;
    }

    if (views >= 1_000) {
      return `${(views / 1_000).toFixed(1)}K`;
    }

    return views.toString();
  };

  // Loading state.
  if (!router.isReady || loading) {
    return (
      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-6 h-32 rounded-2xl bg-gray-200 dark:bg-gray-800 sm:h-40" />
          <div className="mb-4 h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item}>
                <div className="aspect-video rounded-xl bg-gray-200 dark:bg-gray-800" />
                <div className="mt-3 h-4 w-4/5 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="mt-2 h-3 w-2/5 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Error state.
  if (error || !channel) {
    return (
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-4xl py-20 text-center">
          <div className="mb-4 text-5xl">😕</div>
          <h1 className="mb-2 text-2xl font-bold">Channel not found</h1>
          <p className="mb-6 text-gray-500">
            {error || "This channel could not be loaded."}
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => void fetchChannel()}
              className="rounded-lg bg-red-600 px-5 py-2 text-white transition hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => void router.back()}
              className="rounded-lg border border-gray-300 px-5 py-2 transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Go Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  const subscriberCount = channel.subscribers?.length ?? 0;
  const isOwnChannel = user?._id === channel._id;

  // Build video URL using the backend base URL configured in Axios.
  const getVideoUrl = (filepath?: string) => {
    if (!filepath) return "";

    const baseURL = axiosInstance.defaults.baseURL;

    if (!baseURL) {
      console.error("Axios baseURL is not configured.");
      return "";
    }

    const normalizedPath = filepath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    // Support absolute URLs as well as backend-relative file paths.
    if (/^https?:\/\//i.test(filepath)) {
      return filepath;
    }

    return `${baseURL.replace(/\/+$/, "")}/${normalizedPath}`;
  };

  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Channel header */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="h-28 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900 sm:h-40" />

          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Profile image */}
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-800 sm:h-28 sm:w-28">
                {channel.image ? (
                  <img
                    src={channel.image}
                    alt={channel.channelname || channel.name || "Channel"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-gray-500">
                    {(channel.channelname || channel.name || "C")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              {/* Channel details */}
              <div className="flex-1 pt-2">
                <h1 className="text-2xl font-bold sm:text-3xl">
                  {channel.channelname || channel.name}
                </h1>

                <p className="mt-1 text-gray-500">@{channel.name}</p>

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    <strong className="text-gray-900 dark:text-white">
                      {subscriberCount}
                    </strong>{" "}
                    {subscriberCount === 1 ? "subscriber" : "subscribers"}
                  </span>

                  <span>
                    <strong className="text-gray-900 dark:text-white">
                      {videos.length}
                    </strong>{" "}
                    {videos.length === 1 ? "video" : "videos"}
                  </span>
                </div>
              </div>

              {!isOwnChannel && (
                <button
                  onClick={() => void handleSubscribe()}
                  disabled={subscribing}
                  className={`rounded-full px-6 py-3 font-semibold transition disabled:opacity-50 ${subscribed
                      ? "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                      : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                >
                  {subscribing
                    ? "Updating..."
                    : subscribed
                      ? "Subscribed"
                      : "Subscribe"}
                </button>
              )}
            </div>

            {channel.description && (
              <div className="mt-6 max-w-3xl">
                <p className="whitespace-pre-line text-gray-600 dark:text-gray-300">
                  {channel.description}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Channel videos */}
        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold sm:text-2xl">Videos</h2>
            <span className="text-sm text-gray-500">
              {videos.length} {videos.length === 1 ? "video" : "videos"}
            </span>
          </div>

          {videos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
              <div className="mb-4 text-5xl">📹</div>
              <h3 className="mb-2 text-xl font-semibold">No videos yet</h3>
              <p className="text-gray-500">
                This channel hasn&apos;t uploaded any videos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((item) => {
                const videoUrl = getVideoUrl(item.filepath);

                return (
                  <article
                    key={item._id}
                    className="group cursor-pointer"
                    onClick={() => openVideo(item._id)}
                  >
                    {/* Video preview */}
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                      {videoUrl ? (
                        <video
                          src={videoUrl}
                          className="h-full w-full object-cover"
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-500">
                          No preview
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-xl text-black">
                          ▶
                        </div>
                      </div>
                    </div>

                    {/* Video information */}
                    <div className="mt-3">
                      <h3 className="line-clamp-2 text-base font-semibold transition group-hover:text-red-600">
                        {item.videotitle}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
                        <span>{formatViews(item.views ?? 0)} views</span>

                        {item.createdAt && (
                          <>
                            <span>•</span>
                            <span>{formatDate(item.createdAt)}</span>
                          </>
                        )}
                      </div>

                      {item.category && (
                        <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ChannelPage;