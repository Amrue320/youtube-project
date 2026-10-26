import React from "react";
import DownloadsContent from "@/components/DownloadsContent";

export default function DownloadsPage() {
    return (
        <main className="flex-1 p-6">
            <div className="max-w-6xl">
                <h1 className="text-2xl font-bold mb-2">Downloads</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    View your downloaded videos and manage your download history.
                </p>
                <DownloadsContent />
            </div>
        </main>
    );
}