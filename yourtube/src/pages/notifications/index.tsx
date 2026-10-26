"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Bell, Check, Trash2 } from "lucide-react";
import { useRouter } from "next/router";

export default function NotificationsPage() {
    const { user } = useUser();
    const router = useRouter();

    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ================= FETCH NOTIFICATIONS =================

    const fetchNotifications = async () => {
        if (!user?._id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await axiosInstance.get(
                `/notification/${user._id}`
            );

            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unreadCount || 0);
        } catch (error) {
            console.error(
                "Notifications error:",
                error
            );

            setError("Unable to load notifications.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user?._id]);

    // ================= MARK AS READ =================

    const markAsRead = async (
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
                "Mark as read error:",
                error
            );
        }
    };

    // ================= MARK ALL AS READ =================

    const markAllAsRead = async () => {
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
                "Mark all as read error:",
                error
            );
        }
    };

    // ================= DELETE =================

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
                "Delete notification error:",
                error
            );
        }
    };

    // ================= NOTIFICATION CLICK =================

    const handleNotificationClick = async (
        notification: any
    ) => {
        if (!notification.read) {
            await markAsRead(notification._id);
        }

        if (notification.video?._id) {
            router.push(
                `/watch/${notification.video._id}`
            );
        }
    };

    // ================= TIME FORMAT =================

    const formatTime = (date: string) => {
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

    // ================= NOT SIGNED IN =================

    if (!user?._id) {
        return (
            <main className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="w-7 h-7" />

                        <h1 className="text-2xl font-bold">
                            Notifications
                        </h1>
                    </div>

                    <div className="rounded-xl border border-border p-10 text-center">
                        <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

                        <h2 className="text-lg font-semibold">
                            Sign in to view notifications
                        </h2>

                        <p className="text-muted-foreground mt-2">
                            Please sign in to see your latest
                            notifications.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // ================= LOADING =================

    if (loading) {
        return (
            <main className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold mb-6">
                        Notifications
                    </h1>

                    <div className="rounded-xl border border-border p-10 text-center">
                        <p className="text-muted-foreground">
                            Loading notifications...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // ================= ERROR =================

    if (error) {
        return (
            <main className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold mb-6">
                        Notifications
                    </h1>

                    <div className="rounded-xl border border-border p-10 text-center">
                        <p className="text-red-500">
                            {error}
                        </p>

                        <button
                            onClick={fetchNotifications}
                            className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // ================= MAIN PAGE =================

    return (
        <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">

                {/* HEADER */}

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Bell className="w-7 h-7" />

                        <div>
                            <h1 className="text-2xl font-bold">
                                Notifications
                            </h1>

                            {unreadCount > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {unreadCount} unread
                                </p>
                            )}
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="px-4 py-2 rounded-md border border-border hover:bg-accent text-sm"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* EMPTY STATE */}

                {notifications.length === 0 ? (
                    <div className="rounded-xl border border-border p-12 text-center">
                        <Bell className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />

                        <h2 className="text-lg font-semibold">
                            No notifications
                        </h2>

                        <p className="text-muted-foreground mt-2">
                            You're all caught up.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-border overflow-hidden">

                        {notifications.map(
                            (notification: any) => (
                                <div
                                    key={notification._id}
                                    className={`flex items-start gap-4 p-4 border-b border-border last:border-b-0 transition-colors ${!notification.read
                                            ? "bg-accent/40"
                                            : "hover:bg-accent"
                                        }`}
                                >

                                    {/* SENDER IMAGE */}

                                    <div className="flex-shrink-0">
                                        {notification.sender?.image ? (
                                            <img
                                                src={
                                                    notification.sender.image
                                                }
                                                alt="Sender"
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                                <span className="font-semibold">
                                                    {notification.sender
                                                        ?.name?.[0] || "U"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* NOTIFICATION */}

                                    <button
                                        onClick={() =>
                                            handleNotificationClick(
                                                notification
                                            )
                                        }
                                        className="flex-1 text-left min-w-0"
                                    >
                                        <p className="text-sm font-medium text-foreground">
                                            {notification.message}
                                        </p>

                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatTime(
                                                notification.createdAt
                                            )}
                                        </p>

                                        {!notification.read && (
                                            <span className="inline-block mt-2 text-xs font-medium text-primary">
                                                Unread
                                            </span>
                                        )}
                                    </button>

                                    {/* ACTIONS */}

                                    <div className="flex items-center gap-2">

                                        {!notification.read && (
                                            <button
                                                onClick={() =>
                                                    markAsRead(
                                                        notification._id
                                                    )
                                                }
                                                className="p-2 rounded-md hover:bg-background"
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
                                            className="p-2 rounded-md hover:bg-background"
                                            title="Delete notification"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                    </div>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}