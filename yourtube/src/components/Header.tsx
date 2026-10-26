"use client";

import {
  Bell,
  Menu,
  Mic,
  Search,
  User,
  VideoIcon,
  Sun,
  Moon,
  Check,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const Header = () => {
  const { user, logout, handlegooglesignin } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // ================= NOTIFICATIONS =================

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] =
    useState(false);

  const router = useRouter();

  // ================= THEME =================

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // ================= SEARCH SUGGESTIONS =================

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      setSuggestions([]);
      setSelectedSuggestion(-1);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await axiosInstance.get(
          "/video/getall"
        );

        const videos = response.data || [];

        const filtered = videos
          .filter((video: any) => {
            const title =
              video?.videotitle?.toLowerCase() || "";

            const channel =
              video?.videochanel?.toLowerCase() || "";

            return (
              title.includes(query) ||
              channel.includes(query)
            );
          })
          .slice(0, 6);

        setSuggestions(filtered);
        setSelectedSuggestion(-1);
      } catch (error) {
        console.error(
          "Error loading search suggestions:",
          error
        );

        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ================= FETCH NOTIFICATIONS =================

  const fetchNotifications = async () => {
    if (!user?._id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setNotificationLoading(true);

      const response = await axiosInstance.get(
        `/notification/${user._id}`
      );

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error(
        "Error loading notifications:",
        error
      );
    } finally {
      setNotificationLoading(false);
    }
  };

  // Load notifications when user changes
  useEffect(() => {
    if (user?._id) {
      fetchNotifications();
    }
  }, [user?._id]);

  // ================= DARK MODE =================

  const toggleDarkMode = () => {
    const newMode = !darkMode;

    setDarkMode(newMode);

    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // ================= SEARCH =================

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const query = searchQuery.trim();

    if (query) {
      setShowSuggestions(false);
      setSelectedSuggestion(-1);

      router.push(
        `/search?q=${encodeURIComponent(query)}`
      );
    }
  };

  // ================= KEYBOARD NAVIGATION =================

  const handleKeypress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearch(e as any);
      }

      if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
      }

      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();

      setSelectedSuggestion((prev) =>
        prev < suggestions.length - 1
          ? prev + 1
          : 0
      );

      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      setSelectedSuggestion((prev) =>
        prev > 0
          ? prev - 1
          : suggestions.length - 1
      );

      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      if (selectedSuggestion >= 0) {
        handleSuggestionClick(
          suggestions[selectedSuggestion]._id
        );
      } else {
        handleSearch(e as any);
      }

      return;
    }

    if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
    }
  };

  // ================= SUGGESTION CLICK =================

  const handleSuggestionClick = (
    videoId: string
  ) => {
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
    setSearchQuery("");

    router.push(`/watch/${videoId}`);
  };

  // ================= MARK NOTIFICATION READ =================

  const markNotificationAsRead = async (
    notificationId: string
  ) => {
    try {
      await axiosInstance.put(
        `/notification/read/${notificationId}`
      );

      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? {
                ...notification,
                read: true,
              }
            : notification
        )
      );

      setUnreadCount((prev) =>
        prev > 0 ? prev - 1 : 0
      );
    } catch (error) {
      console.error(
        "Error marking notification as read:",
        error
      );
    }
  };

  // ================= MARK ALL READ =================

  const markAllNotificationsAsRead = async () => {
    if (!user?._id || unreadCount === 0) {
      return;
    }

    try {
      await axiosInstance.put(
        `/notification/read-all/${user._id}`
      );

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Error marking all notifications as read:",
        error
      );
    }
  };

  // ================= DELETE NOTIFICATION =================

  const deleteNotification = async (
    notificationId: string
  ) => {
    try {
      const notification = notifications.find(
        (item) => item._id === notificationId
      );

      await axiosInstance.delete(
        `/notification/${notificationId}`
      );

      setNotifications((prev) =>
        prev.filter(
          (item) => item._id !== notificationId
        )
      );

      if (notification && !notification.read) {
        setUnreadCount((prev) =>
          prev > 0 ? prev - 1 : 0
        );
      }
    } catch (error) {
      console.error(
        "Error deleting notification:",
        error
      );
    }
  };

  // ================= NOTIFICATION CLICK =================

  const handleNotificationClick = async (
    notification: any
  ) => {
    if (!notification.read) {
      await markNotificationAsRead(
        notification._id
      );
    }

    if (notification.video?._id) {
      setShowNotifications(false);

      router.push(
        `/watch/${notification.video._id}`
      );
    }
  };

  // ================= FORMAT TIME =================

  const formatNotificationTime = (
    date: string
  ) => {
    if (!date) return "";

    const created = new Date(date);
    const now = new Date();

    const difference =
      now.getTime() - created.getTime();

    const minutes = Math.floor(
      difference / (1000 * 60)
    );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days}d ago`;
    }

    return created.toLocaleDateString();
  };

  return (
    <header className="relative z-50 flex items-center justify-between px-4 py-2 bg-background text-foreground border-b border-border">

      {/* ================= LEFT SECTION ================= */}

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
        >
          <Menu className="w-6 h-6" />
        </Button>

        <Link
          href="/"
          className="flex items-center gap-1"
        >
          <div className="bg-red-600 p-1 rounded">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>

          <span className="text-xl font-medium">
            YourTube
          </span>

          <span className="text-xs text-muted-foreground ml-1">
            IN
          </span>
        </Link>
      </div>

      {/* ================= SEARCH ================= */}

      <form
        onSubmit={handleSearch}
        className="relative flex items-center gap-2 flex-1 max-w-2xl mx-4"
      >
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onFocus={() => {
              if (searchQuery.trim()) {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={handleKeypress}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedSuggestion(-1);
            }}
            className="rounded-l-full border-r-0 focus-visible:ring-0"
          />

          <Button
            type="submit"
            className="rounded-r-full px-6 bg-muted hover:bg-accent text-muted-foreground border border-l-0"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <Mic className="w-5 h-5" />
        </Button>

        {/* SEARCH SUGGESTIONS */}

        {showSuggestions &&
          searchQuery.trim() && (
            <div className="absolute top-full left-0 right-12 mt-2 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
              {suggestions.length > 0 ? (
                suggestions.map((video, index) => (
                  <button
                    key={video._id}
                    type="button"
                    onClick={() =>
                      handleSuggestionClick(
                        video._id
                      )
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedSuggestion === index
                        ? "bg-accent"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {video?.videotitle ||
                          "Untitled Video"}
                      </p>

                      <p className="text-xs text-muted-foreground truncate">
                        {video?.videochanel ||
                          "Unknown Channel"}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  No matching videos or channels found.
                </div>
              )}
            </div>
          )}
      </form>

      {/* ================= RIGHT SECTION ================= */}

      <div className="flex items-center gap-2">

        {/* DARK MODE */}

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={toggleDarkMode}
          title={
            darkMode
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {darkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        {/* ================= LOGGED IN ================= */}

        {user ? (
          <>
            <Button
              variant="ghost"
              size="icon"
            >
              <VideoIcon className="w-6 h-6" />
            </Button>

            {/* ================= NOTIFICATION BELL ================= */}

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {
                  setShowNotifications(
                    !showNotifications
                  );

                  if (!showNotifications) {
                    fetchNotifications();
                  }
                }}
                title="Notifications"
              >
                <Bell className="w-6 h-6" />

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
              </Button>

              {/* ================= NOTIFICATION DROPDOWN ================= */}

              {showNotifications && (
                <div className="absolute right-0 top-11 w-[380px] max-w-[90vw] bg-background border border-border rounded-xl shadow-2xl overflow-hidden">

                  {/* HEADER */}

                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Notifications
                      </h3>

                      {unreadCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {unreadCount} unread
                        </p>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        onClick={
                          markAllNotificationsAsRead
                        }
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* NOTIFICATIONS */}

                  <div className="max-h-[420px] overflow-y-auto">
                    {notificationLoading ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />

                        <p className="font-medium text-foreground">
                          No notifications
                        </p>

                        <p className="text-sm text-muted-foreground mt-1">
                          You're all caught up.
                        </p>
                      </div>
                    ) : (
                      notifications
                        .slice(0, 10)
                        .map((notification: any) => (
                          <div
                            key={notification._id}
                            className={`flex items-start gap-3 p-3 border-b border-border hover:bg-accent transition-colors ${
                              !notification.read
                                ? "bg-accent/40"
                                : ""
                            }`}
                          >
                            {/* AVATAR */}

                            <Avatar className="w-9 h-9 flex-shrink-0">
                              <AvatarImage
                                src={
                                  notification.sender
                                    ?.image || ""
                                }
                              />

                              <AvatarFallback>
                                {notification.sender
                                  ?.name?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>

                            {/* MESSAGE */}

                            <button
                              onClick={() =>
                                handleNotificationClick(
                                  notification
                                )
                              }
                              className="flex-1 min-w-0 text-left"
                            >
                              <p className="text-sm text-foreground leading-5">
                                {notification.message}
                              </p>

                              <p className="text-xs text-muted-foreground mt-1">
                                {formatNotificationTime(
                                  notification.createdAt
                                )}
                              </p>
                            </button>

                            {/* ACTIONS */}

                            <div className="flex items-center gap-1">

                              {!notification.read && (
                                <button
                                  onClick={() =>
                                    markNotificationAsRead(
                                      notification._id
                                    )
                                  }
                                  className="p-1.5 rounded-md hover:bg-background"
                                  title="Mark as read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  deleteNotification(
                                    notification._id
                                  )
                                }
                                className="p-1.5 rounded-md hover:bg-background"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  {/* FOOTER */}

                  <div className="border-t border-border p-2">
                    <Link
                      href="/notifications"
                      onClick={() =>
                        setShowNotifications(false)
                      }
                      className="block w-full text-center text-sm font-medium py-2 rounded-md hover:bg-accent"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ================= USER MENU ================= */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />

                    <AvatarFallback>
                      {user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56"
                align="end"
                forceMount
              >
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/channel/${user?._id}`}
                    >
                      Your channel
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setisdialogeopen(true)
                      }
                    >
                      Create Channel
                    </Button>
                  </div>
                )}

                <DropdownMenuItem asChild>
                  <Link href="/history">
                    History
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/liked">
                    Liked videos
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/watch-later">
                    Watch later
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/subscriptions">
                    Subscriptions
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={logout}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button
            className="flex items-center gap-2"
            onClick={handlegooglesignin}
          >
            <User className="w-4 h-4" />
            Sign in
          </Button>
        )}
      </div>

      {/* ================= CHANNEL DIALOG ================= */}

      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() =>
          setisdialogeopen(false)
        }
        mode="create"
      />
    </header>
  );
};

export default Header;