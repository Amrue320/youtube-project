import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const ChannelHeader = ({ channel, user }: any) => {
  const { user: loggedInUser } = useUser();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentUser = user || loggedInUser;

  const channelName =
    channel?.channelname || channel?.name || "My Channel";

  const channelDescription = channel?.description || "";

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!currentUser?._id || !channel?._id) {
        return;
      }

      if (currentUser._id === channel._id) {
        return;
      }

      try {
        const res = await axiosInstance.get(
          `/user/checksubscription/${channel._id}/${currentUser._id}`
        );

        setIsSubscribed(res.data.subscribed);
      } catch (error) {
        console.error(
          "Error checking subscription:",
          error
        );
      }
    };

    checkSubscriptionStatus();
  }, [currentUser?._id, channel?._id]);

  const handleSubscribe = async () => {
    if (!currentUser?._id || !channel?._id) {
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post(
        `/user/subscribe/${channel._id}`,
        {
          userId: currentUser._id,
        }
      );

      setIsSubscribed(res.data.subscribed);
    } catch (error) {
      console.error(
        "Error subscribing to channel:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-foreground">

      {/* Banner */}
      <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden">
      </div>

      {/* Channel Info */}
      <div className="px-4 py-6">

        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* Avatar */}
          <Avatar className="w-20 h-20 md:w-32 md:h-32">

            <AvatarImage src={channel?.image || ""} />

            <AvatarFallback className="text-2xl">
              {channelName[0]?.toUpperCase() || "U"}
            </AvatarFallback>

          </Avatar>

          {/* Channel Details */}
          <div className="flex-1 space-y-2">

            <h1 className="text-2xl md:text-4xl font-bold">
              {channelName}
            </h1>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">

              <span>
                @{channelName
                  .toLowerCase()
                  .replace(/\s+/g, "")}
              </span>

              <span>
                {channel?.subscribers?.length || 0} subscribers
              </span>

            </div>

            {channelDescription && (
              <p className="text-sm text-muted-foreground max-w-2xl">
                {channelDescription}
              </p>
            )}

          </div>

          {/* Subscribe */}
          {currentUser &&
            channel &&
            currentUser._id !== channel._id && (
              <div className="flex gap-2">

                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  variant={
                    isSubscribed
                      ? "outline"
                      : "default"
                  }
                  className={
                    isSubscribed
                      ? "bg-muted hover:bg-accent"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }
                >
                  {loading
                    ? "Please wait..."
                    : isSubscribed
                      ? "Subscribed"
                      : "Subscribe"}
                </Button>

              </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;