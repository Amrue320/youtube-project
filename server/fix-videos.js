import mongoose from "mongoose";
import dotenv from "dotenv";
import video from "./Modals/video.js";

dotenv.config();

const fixVideos = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);

        console.log("MongoDB connected");

        const result = await video.updateMany(
            {
                _id: {
                    $in: [
                        "6a6cbcfb9c6b9af7f3a0a2ae",
                        "6a6cbccd9c6b9af7f3a0a2ac",
                    ],
                },
            },
            {
                $set: {
                    videochanel: "Amru",
                    uploader: "6a6a15d0f2e51160cf34fbd5",
                },
            }
        );

        console.log("Matched:", result.matchedCount);
        console.log("Updated:", result.modifiedCount);

        await mongoose.disconnect();

        console.log("Done");
    } catch (error) {
        console.error("Error:", error);
    }
};

fixVideos();