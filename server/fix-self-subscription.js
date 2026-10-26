import mongoose from "mongoose";
import dotenv from "dotenv";
import users from "./Modals/Auth.js";
import subscription from "./Modals/subscription.js";

dotenv.config();

const userId = "6a6a15d0f2e51160cf34fbd5";

const fixSelfSubscription = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);

        console.log("MongoDB connected");

        // Remove the user's own ID from subscribedChannels
        await users.findByIdAndUpdate(userId, {
            $pull: {
                subscribedChannels: userId,
                subscribers: userId,
            },
        });

        // Remove any self-subscription record
        const result = await subscription.deleteMany({
            subscriber: userId,
            channel: userId,
        });

        console.log("Self-subscription records removed:", result.deletedCount);
        console.log("Self-subscription data fixed.");

        await mongoose.disconnect();

        console.log("Done");
    } catch (error) {
        console.error("Error:", error);
    }
};

fixSelfSubscription();