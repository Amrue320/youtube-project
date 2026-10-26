
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Crown, Users, Zap, X, CreditCard } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface ChannelSubscription {
    _id: string;
    channel?: {
        _id: string;
        name?: string;
        channelname?: string;
        description?: string;
        image?: string;
    } | null;
}

interface MockPayment {
    paymentId: string;
    reference: string;
    plan: string;
    amount: number;
    currency: string;
}

const PLANS = [
    {
        name: "Free",
        price: "₹0",
        description: "Get started with YourTube.",
        downloads: "1 download per day",
        features: [
            "Watch videos",
            "Subscribe to channels",
            "Save videos to Watch Later",
            "1 download per day",
        ],
    },
    {
        name: "Bronze",
        price: "₹99",
        description: "For regular viewers.",
        downloads: "5 downloads per day",
        features: [
            "Everything in Free",
            "5 downloads per day",
            "Download history",
            "Standard support",
        ],
    },
    {
        name: "Silver",
        price: "₹199",
        description: "For frequent viewers.",
        downloads: "15 downloads per day",
        features: [
            "Everything in Bronze",
            "15 downloads per day",
            "Enhanced viewing experience",
            "Priority support",
        ],
    },
    {
        name: "Gold",
        price: "₹299",
        description: "For the ultimate viewer.",
        downloads: "30 downloads per day",
        features: [
            "Everything in Silver",
            "30 downloads per day",
            "All standard membership benefits",
            "Priority support",
        ],
    },
];

export default function SubscriptionsPage() {
    const { user } = useUser();

    const [subscriptions, setSubscriptions] = useState<
        ChannelSubscription[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [currentPlan, setCurrentPlan] = useState("free");
    const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
    const [payment, setPayment] = useState<MockPayment | null>(null);
    const [creatingOrder, setCreatingOrder] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        const fetchSubscriptions = async () => {
            if (!user?._id) {
                setSubscriptions([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const res = await axiosInstance.get(
                    `/subscription/user/${user._id}`
                );

                setSubscriptions(
                    Array.isArray(res.data?.subscriptions)
                        ? res.data.subscriptions
                        : []
                );
            } catch (err) {
                console.error("Subscriptions error:", err);
                setError("Unable to load channel subscriptions.");
            } finally {
                setLoading(false);
            }
        };

        void fetchSubscriptions();
    }, [user?._id]);

    const refreshMembership = async () => {
        if (!user?._id) return;

        const res = await axiosInstance.get(
            `/subscription/plan/${user._id}`
        );

        if (res.data?.success) {
            setCurrentPlan(
                String(res.data.plan || "free").toLowerCase()
            );
            setPlanExpiresAt(res.data.planExpiresAt || null);
        }
    };

    useEffect(() => {
        if (!user?._id) {
            setCurrentPlan("free");
            setPlanExpiresAt(null);
            return;
        }

        refreshMembership().catch((err) => {
            console.error("Membership plan error:", err);
        });
        // refreshMembership is intentionally called when the signed-in user changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id]);

    const handleChoosePlan = async (planName: string) => {
        if (!user?._id) {
            toast.error("Please sign in to choose a plan.");
            return;
        }

        if (planName === "Free") {
            toast.info("The Free plan is available by default.");
            return;
        }

        if (creatingOrder || processingPayment) return;

        try {
            setCreatingOrder(true);

            const res = await axiosInstance.post(
                "/subscription/mock/create-order",
                {
                    userId: user._id,
                    plan: planName.toLowerCase(),
                }
            );

            if (!res.data?.success) {
                throw new Error(
                    res.data?.message || "Unable to create demo checkout."
                );
            }

            setPayment({
                paymentId: res.data.paymentId,
                reference: res.data.reference,
                plan: res.data.plan,
                amount: res.data.amount,
                currency: res.data.currency || "INR",
            });

            toast.info("Demo checkout created. No money will be charged.");
        } catch (err: any) {
            console.error("Create demo checkout error:", err);
            toast.error(
                err?.response?.data?.message ||
                err?.message ||
                "Unable to start demo checkout."
            );
        } finally {
            setCreatingOrder(false);
        }
    };

    const handleMockPayment = async (
        outcome: "success" | "failure"
    ) => {
        if (!user?._id || !payment || processingPayment) return;

        try {
            setProcessingPayment(true);

            const res = await axiosInstance.post(
                "/subscription/mock/confirm",
                {
                    userId: user._id,
                    paymentId: payment.paymentId,
                    outcome,
                }
            );

            if (!res.data?.success) {
                throw new Error(
                    res.data?.message || "Demo payment could not be processed."
                );
            }

            if (outcome === "success") {
                await refreshMembership();

                toast.success(
                    `Demo payment successful! Your ${payment.plan} membership is activated.`
                );
            } else {
                toast.error(
                    "Simulated payment failed. Your membership was not changed."
                );
            }

            setPayment(null);
        } catch (err: any) {
            console.error("Demo payment error:", err);
            toast.error(
                err?.response?.data?.message ||
                err?.message ||
                "Unable to process demo payment."
            );
        } finally {
            setProcessingPayment(false);
        }
    };

    const formatDate = (value: string) =>
        new Date(value).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    return (
        <main className="min-h-screen flex-1 space-y-10 p-4 sm:p-6">
            <div className="mx-auto max-w-6xl space-y-3">
                <div className="flex items-center gap-3">
                    <Crown className="h-7 w-7 text-primary" />
                    <h1 className="text-2xl font-bold sm:text-3xl">
                        YourTube Memberships
                    </h1>
                </div>

                <p className="text-muted-foreground">
                    Choose a membership to enjoy additional download benefits.
                </p>

                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <strong>Demo mode:</strong> Payments are simulated for
                    project testing. No real money is charged.
                </div>

                <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                        Your current membership
                    </p>
                    <p className="mt-1 text-lg font-semibold capitalize">
                        {currentPlan}
                    </p>
                    {planExpiresAt && currentPlan !== "free" && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            Expires on {formatDate(planExpiresAt)}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                    {PLANS.map((plan) => {
                        const isFree = plan.name === "Free";
                        const isHighlighted = plan.name === "Silver";
                        const isCurrent =
                            currentPlan === plan.name.toLowerCase();

                        return (
                            <section
                                key={plan.name}
                                className={`flex flex-col rounded-xl border p-5 ${isHighlighted
                                        ? "border-primary shadow-lg"
                                        : "border-border"
                                    }`}
                            >
                                {isHighlighted && (
                                    <span className="mb-3 w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                        Popular
                                    </span>
                                )}

                                <h2 className="text-xl font-bold">
                                    {plan.name}
                                </h2>

                                <p className="mt-2 min-h-10 text-sm text-muted-foreground">
                                    {plan.description}
                                </p>

                                <div className="my-5">
                                    <span className="text-3xl font-bold">
                                        {plan.price}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {isFree ? " / forever" : " / 30 days"}
                                    </span>
                                </div>

                                <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                                    <Zap className="h-4 w-4 shrink-0 text-primary" />
                                    <span>{plan.downloads}</span>
                                </div>

                                <ul className="flex-1 space-y-3">
                                    {plan.features.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    type="button"
                                    disabled={
                                        creatingOrder ||
                                        processingPayment ||
                                        isCurrent
                                    }
                                    onClick={() =>
                                        void handleChoosePlan(plan.name)
                                    }
                                    className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${isHighlighted
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-secondary text-secondary-foreground"
                                        }`}
                                >
                                    {isCurrent
                                        ? "Current plan"
                                        : isFree
                                            ? "Free plan"
                                            : creatingOrder
                                                ? "Preparing checkout..."
                                                : `Choose ${plan.name}`}
                                </button>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* Demo checkout dialog */}
            {payment && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mock-payment-title"
                >
                    <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                                    <CreditCard className="h-5 w-5 text-primary" />
                                </div>
                                <h2
                                    id="mock-payment-title"
                                    className="text-xl font-bold"
                                >
                                    Demo Checkout
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Simulate a payment for testing.
                                </p>
                            </div>

                            <button
                                type="button"
                                aria-label="Close checkout"
                                disabled={processingPayment}
                                onClick={() => setPayment(null)}
                                className="rounded-md p-2 hover:bg-muted disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3 rounded-lg bg-muted p-4">
                            <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">
                                    Membership
                                </span>
                                <strong className="capitalize">
                                    {payment.plan}
                                </strong>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">
                                    Duration
                                </span>
                                <span>30 days</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">
                                    Demo amount
                                </span>
                                <strong>
                                    ₹{payment.amount}
                                </strong>
                            </div>
                        </div>

                        <p className="my-4 text-xs text-muted-foreground">
                            Reference: {payment.reference}
                        </p>

                        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                            This is a mock transaction. No real payment
                            is being processed.
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                disabled={processingPayment}
                                onClick={() =>
                                    void handleMockPayment("success")
                                }
                                className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {processingPayment
                                    ? "Processing..."
                                    : "Simulate Successful Payment"}
                            </button>

                            <button
                                type="button"
                                disabled={processingPayment}
                                onClick={() =>
                                    void handleMockPayment("failure")
                                }
                                className="w-full rounded-lg border border-border px-4 py-3 font-semibold hover:bg-muted disabled:opacity-50"
                            >
                                Simulate Failed Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Existing channel subscriptions remain separate from memberships. */}
            <section className="mx-auto max-w-4xl space-y-5">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-bold">
                        Your Channel Subscriptions
                    </h2>
                </div>

                <p className="text-sm text-muted-foreground">
                    Channels you follow are different from your paid
                    membership plan.
                </p>

                {!user?._id ? (
                    <p className="text-muted-foreground">
                        Please sign in to view your channel subscriptions.
                    </p>
                ) : loading ? (
                    <p className="text-muted-foreground">
                        Loading channel subscriptions...
                    </p>
                ) : error ? (
                    <p className="text-red-500">{error}</p>
                ) : subscriptions.length === 0 ? (
                    <div className="rounded-xl border border-border py-10 text-center">
                        <p className="text-muted-foreground">
                            You haven&apos;t subscribed to any channels yet.
                        </p>

                        <Link
                            href="/"
                            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
                        >
                            Browse Videos
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {subscriptions.map((item) => {
                            const channel = item.channel;

                            if (!channel?._id) return null;

                            const channelName =
                                channel.channelname ||
                                channel.name ||
                                "Unknown Channel";

                            return (
                                <div
                                    key={item._id}
                                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4"
                                >
                                    <div className="flex min-w-0 items-center gap-4">
                                        {channel.image ? (
                                            <img
                                                src={channel.image}
                                                alt={channelName}
                                                className="h-12 w-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                                                <span className="text-lg font-semibold">
                                                    {channelName
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        <div className="min-w-0">
                                            <h3 className="font-semibold">
                                                {channelName}
                                            </h3>

                                            {channel.description && (
                                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                                    {channel.description}
                                                </p>
                                            )}

                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Subscribed channel
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        href="/"
                                        className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:opacity-90"
                                    >
                                        Browse Videos
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
