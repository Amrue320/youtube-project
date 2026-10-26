"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface VideoInfoProps {
  video: any;
}

export default function VideoInfo({
  video,
}: VideoInfoProps) {
  const { user } = useUser();

  const [subscribed, setSubscribed] = useState(false);
  const [subscribers, setSubscribers] = useState(0);
  const [loadingSubscription, setLoadingSubscription] =
    useState(false);

  // Channel owner ID
  const channelId = video?.uploader;

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?._id || !channelId) {
        setSubscribed(false);
        setSubscribers(0);
        return;
      }

      try {
        const res = await axiosInstance.get(
          `/subscription/check/${channelId}/${user._id}`
        );

        if (res.data.success) {
          setSubscribed(Boolean(res.data.subscribed));
          setSubscribers(res.data.subscribers ?? 0);
        }
      } catch (error: any) {
        console.error(
          "Check subscription error:",
          error?.response?.data || error
        );
      }
    };

    checkSubscription();
  }, [user?._id, channelId]);

  const handleSubscription = async () => {
    if (!user?._id) {
      toast.error("Please sign in to subscribe.");
      return;
    }

    if (!channelId) {
      toast.error("Channel information is missing.");
      return;
    }

    if (user._id === channelId) {
      toast.error(
        "You cannot subscribe to your own channel."
      );
      return;
    }

    try {
      setLoadingSubscription(true);

      const res = await axiosInstance.post(
        `/subscription/${channelId}`,
        {
          userId: user._id,
        }
      );

      if (res.data.success) {
        setSubscribed(Boolean(res.data.subscribed));
        setSubscribers(res.data.subscribers ?? 0);

        if (res.data.subscribed) {
          toast.success("Subscribed successfully");
        } else {
          toast.success("Unsubscribed successfully");
        }
      }
    } catch (error: any) {
      console.error(
        "Subscription error:",
        error?.response?.data || error
      );

      toast.error(
        error?.response?.data?.message ||
        "Unable to update subscription."
      );
    } finally {
      setLoadingSubscription(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">
        {video?.videotitle || "Untitled Video"}
      </h1>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-foreground">
            {video?.videochanel || "Unknown Channel"}
          </p>

          <p className="text-sm text-muted-foreground">
            {subscribers.toLocaleString()} subscribers
          </p>
        </div>

        {user?._id !== channelId && (
          <Button
            type="button"
            onClick={handleSubscription}
            disabled={loadingSubscription}
            className="rounded-full px-6"
          >
            {loadingSubscription
              ? "Please wait..."
              : subscribed
                ? "Subscribed"
                : "Subscribe"}
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {(video?.views ?? 0).toLocaleString()} views
        {" • "}
        {video?.createdAt
          ? new Date(video.createdAt).toLocaleDateString()
          : "Just now"}
      </div>

      {video?.description && (
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {video.description}
          </p>
        </div>
      )}
    </div>
  );
}