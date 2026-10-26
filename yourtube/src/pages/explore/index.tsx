import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";
import VideoCard from "@/components/videocard";

const Explore = () => {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const res = await axiosInstance.get("/video/getall");
                setVideos(res.data);
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    if (loading) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-lg font-semibold">Loading videos...</h2>
            </div>
        );
    }

    return (
        <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Explore</h1>

                <div className="flex flex-wrap gap-3 mb-8">
                    {[
                        "Trending",
                        "Music",
                        "Gaming",
                        "Movies",
                        "News",
                        "Sports",
                        "Technology",
                        "Education",
                        "Comedy",
                        "Fashion",
                    ].map((category) => (
                        <button
                            key={category}
                            className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {videos.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                        No videos available.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {videos.map((video) => (
                            <VideoCard key={video._id} video={video} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
};

export default Explore;