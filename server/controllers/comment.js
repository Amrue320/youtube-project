
import comment from "../Modals/comment.js";
import commentReport from "../Modals/commentReport.js";
import mongoose from "mongoose";

const MAX_COMMENT_LENGTH = 500;
const DUPLICATE_WINDOW_MS = 30 * 1000;
const RAPID_WINDOW_MS = 10 * 1000;
const RAPID_SUBMISSION_LIMIT = 5;

const ABUSIVE_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
];

const validateComment = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "Comment cannot be empty";
  }

  const text = value.trim();

  if (text.length > MAX_COMMENT_LENGTH) {
    return `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`;
  }

  if (/^(.)\1{9,}$/u.test(text)) {
    return "Please avoid repeated characters or symbols";
  }

  if (/(.)\1{7,}/u.test(text)) {
    return "Please avoid excessive repeated characters";
  }

  const urls = text.match(/https?:\/\/\S+/gi) || [];

  if (urls.length >= 3) {
    return "Your comment appears to contain spam links";
  }

  const normalized = text.toLowerCase();

  const containsAbusiveWord = ABUSIVE_WORDS.some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(normalized);
  });

  if (containsAbusiveWord) {
    return "Please remove abusive language from your comment";
  }

  return null;
};

const normalizeComment = (value) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

// Create a comment or reply
export const postcomment = async (req, res) => {
  try {
    const authenticatedUserId = req.user?._id?.toString();
    const { videoid, commentbody, parentComment } = req.body;

    if (
      !authenticatedUserId ||
      !mongoose.Types.ObjectId.isValid(authenticatedUserId)
    ) {
      return res.status(401).json({
        message: "Please sign in to comment",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(videoid)) {
      return res.status(400).json({
        message: "Valid Video ID is required",
      });
    }

    const validationError = validateComment(commentbody);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (
      parentComment &&
      !mongoose.Types.ObjectId.isValid(parentComment)
    ) {
      return res.status(400).json({
        message: "Invalid parent comment ID",
      });
    }

    // Ensure the parent comment belongs to the same video.
    if (parentComment) {
      const parent = await comment.findById(parentComment);

      if (!parent || String(parent.videoid) !== String(videoid)) {
        return res.status(400).json({
          message: "Parent comment was not found for this video",
        });
      }
    }

    const normalizedComment = normalizeComment(commentbody);
    const now = Date.now();

    // Apply duplicate protection only to top-level comments.
    // Replies are allowed to match existing comments.
    if (!parentComment) {
      const recentComments = await comment
        .find({
          userid: authenticatedUserId,
          videoid,
          parentComment: null,
          createdAt: {
            $gte: new Date(now - DUPLICATE_WINDOW_MS),
          },
        })
        .select("commentbody")
        .lean();

      const duplicateComment = recentComments.some(
        (existing) =>
          typeof existing.commentbody === "string" &&
          normalizeComment(existing.commentbody) === normalizedComment
      );

      if (duplicateComment) {
        return res.status(429).json({
          message:
            "You recently posted this comment. Please wait 30 seconds before repeating it.",
        });
      }
    }

    // Limit submissions to five comments/replies per user per video
    // within a rolling ten-second window.
    const recentSubmissions = await comment.countDocuments({
      userid: authenticatedUserId,
      videoid,
      createdAt: {
        $gte: new Date(now - RAPID_WINDOW_MS),
      },
    });

    if (recentSubmissions >= RAPID_SUBMISSION_LIMIT) {
      return res.status(429).json({
        message:
          "You are commenting too quickly. Please wait a little before commenting again.",
      });
    }

    const newComment = new comment({
      userid: authenticatedUserId,
      videoid,
      commentbody: commentbody.trim(),
      usercommented:
        req.user.name ||
        req.user.username ||
        req.user.email ||
        "User",
      parentComment: parentComment || null,
    });

    await newComment.save();

    return res.status(201).json({
      comment: true,
      result: newComment,
    });
  } catch (error) {
    console.error("Post comment error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Get all comments and replies for a video
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(videoid)) {
      return res.status(400).json({
        message: "Invalid video ID",
      });
    }

    const commentvideo = await comment
      .find({ videoid })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Delete a comment and its direct replies.
// Only the comment owner can delete it.
export const deletecomment = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid comment ID",
    });
  }

  try {
    const existingComment = await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (String(existingComment.userid) !== String(req.user?._id)) {
      return res.status(403).json({
        message: "You can only delete your own comment",
      });
    }

    await comment.deleteMany({
      $or: [{ _id: id }, { parentComment: id }],
    });

    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("Delete comment error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Edit a comment or reply.
// Only the comment owner can edit it.
export const editcomment = async (req, res) => {
  const { id } = req.params;
  const { commentbody } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid comment ID",
    });
  }

  const validationError = validateComment(commentbody);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const existingComment = await comment.findById(id);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (String(existingComment.userid) !== String(req.user?._id)) {
      return res.status(403).json({
        message: "You can only edit your own comment",
      });
    }

    existingComment.commentbody = commentbody.trim();
    await existingComment.save();

    return res.status(200).json(existingComment);
  } catch (error) {
    console.error("Edit comment error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Report a comment for review
export const reportcomment = async (req, res) => {
  const { id: commentId } = req.params;
  const reporterId = req.user?._id?.toString();
  const { reason } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(commentId) ||
    !mongoose.Types.ObjectId.isValid(reporterId)
  ) {
    return res.status(401).json({
      message: "Please sign in to report a comment",
    });
  }

  if (typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({
      message: "Please provide a reason for reporting",
    });
  }

  if (reason.trim().length > 300) {
    return res.status(400).json({
      message: "Report reason cannot exceed 300 characters",
    });
  }

  try {
    const existingComment = await comment.findById(commentId);

    if (!existingComment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (String(existingComment.userid) === reporterId) {
      return res.status(400).json({
        message: "You cannot report your own comment",
      });
    }

    const report = await commentReport.findOneAndUpdate(
      { commentId, reporterId },
      {
        $setOnInsert: {
          commentId,
          reporterId,
          reason: reason.trim(),
          status: "pending",
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(201).json({
      success: true,
      message: "Comment reported for review",
      report,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reported this comment",
      });
    }

    console.error("Report comment error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
