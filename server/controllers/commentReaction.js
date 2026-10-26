
import mongoose from "mongoose";
import comment from "../Modals/comment.js";

export const reactToComment = async (req, res) => {
    const { id } = req.params;
    const { reaction } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid comment ID" });
    }

    if (!["like", "dislike"].includes(reaction)) {
        return res.status(400).json({
            message: "Reaction must be like or dislike",
        });
    }

    try {
        const existingComment = await comment.findById(id);

        if (!existingComment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ message: "Please sign in first" });
        }

        const userIdString = userId.toString();

        const likes = existingComment.likes || [];
        const dislikes = existingComment.dislikes || [];

        const hasLiked = likes.some(
            (item) => item.toString() === userIdString
        );

        const hasDisliked = dislikes.some(
            (item) => item.toString() === userIdString
        );

        if (reaction === "like") {
            existingComment.dislikes = dislikes.filter(
                (item) => item.toString() !== userIdString
            );

            existingComment.likes = hasLiked
                ? likes.filter((item) => item.toString() !== userIdString)
                : [...likes, userId];
        } else {
            existingComment.likes = likes.filter(
                (item) => item.toString() !== userIdString
            );

            existingComment.dislikes = hasDisliked
                ? dislikes.filter((item) => item.toString() !== userIdString)
                : [...dislikes, userId];
        }

        await existingComment.save();

        const updatedLikes = existingComment.likes || [];
        const updatedDislikes = existingComment.dislikes || [];

        const userReaction = updatedLikes.some(
            (item) => item.toString() === userIdString
        )
            ? "like"
            : updatedDislikes.some(
                (item) => item.toString() === userIdString
            )
                ? "dislike"
                : null;

        return res.status(200).json({
            success: true,
            likes: updatedLikes.length,
            dislikes: updatedDislikes.length,
            userReaction,
        });
    } catch (error) {
        console.error("Comment reaction error:", error);
        return res.status(500).json({
            message: "Failed to update reaction",
        });
    }
};
