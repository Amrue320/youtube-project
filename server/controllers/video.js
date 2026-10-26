import like from "../Modals/like.js";
import mongoose from "mongoose";
import video from "../Modals/video.js";
import users from "../Modals/Auth.js";

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload an MP4 video file.",
    });
  }

  try {
    const file = new video({
      videotitle: req.body.videotitle,
      filename: req.file.originalname,
      filepath: req.file.path,
      filetype: req.file.mimetype,
      filesize: req.file.size,
      videochanel: req.body.videochanel,
      uploader: req.body.uploader,
      category: req.body.category || "All",
    });

    await file.save();

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully.",
      video: file,
    });
  } catch (error) {
    console.error("Upload Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find().sort({ createdAt: -1 });

    const updatedFiles = await Promise.all(
      files.map(async (file) => {
        if (
          file.uploader &&
          mongoose.Types.ObjectId.isValid(file.uploader)
        ) {
          return file;
        }

        const channelUser = await users.findOne({
          $or: [
            {
              channelname: file.videochanel,
            },
            {
              name: file.videochanel,
            },
          ],
        });

        if (channelUser) {
          file.uploader = channelUser._id.toString();
          await file.save();
        }

        return file;
      })
    );

    return res.status(200).json(updatedFiles);
  } catch (error) {
    console.error("Fetch Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
};

// ==========================================
// SEARCH VIDEOS
// ==========================================
export const searchVideos = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(200).json([]);
    }

    const searchTerm = query.trim();

    const videos = await video
      .find({
        $or: [
          {
            videotitle: {
              $regex: searchTerm,
              $options: "i",
            },
          },
          {
            videochanel: {
              $regex: searchTerm,
              $options: "i",
            },
          },
          {
            description: {
              $regex: searchTerm,
              $options: "i",
            },
          },
          {
            category: {
              $regex: searchTerm,
              $options: "i",
            },
          },
        ],
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(videos);
  } catch (error) {
    console.error("Search Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to search videos.",
    });
  }
};

// ==========================================
// INCREMENT VIDEO VIEWS
// ==========================================
export const incrementViews = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedVideo = await video.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!updatedVideo) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "View count updated",
      views: updatedVideo.views,
    });
  } catch (error) {
    console.error("View count error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update views",
    });
  }
};

// ==========================================
// LIKE / UNLIKE VIDEO
// ==========================================
export const handleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const existingLike = await like.findOne({
      viewer: userId,
      videoid: id,
    });

    // UNLIKE
    if (existingLike) {
      await like.findByIdAndDelete(existingLike._id);

      const likeCount = await like.countDocuments({
        videoid: id,
      });

      await video.findByIdAndUpdate(id, {
        Like: likeCount,
      });

      return res.status(200).json({
        success: true,
        liked: false,
        likes: likeCount,
        message: "Video unliked",
      });
    }

    // LIKE
    await like.create({
      viewer: userId,
      videoid: id,
    });

    const likeCount = await like.countDocuments({
      videoid: id,
    });

    await video.findByIdAndUpdate(id, {
      Like: likeCount,
    });

    return res.status(200).json({
      success: true,
      liked: true,
      likes: likeCount,
      message: "Video liked",
    });
  } catch (error) {
    console.error("Like error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update like",
    });
  }
};

// ==========================================
// CHECK LIKE STATUS
// ==========================================
export const checkLike = async (req, res) => {
  try {
    const { videoId, userId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(videoId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const existingLike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });

    const likeCount = await like.countDocuments({
      videoid: videoId,
    });

    return res.status(200).json({
      success: true,
      liked: Boolean(existingLike),
      likes: likeCount,
    });
  } catch (error) {
    console.error("Check like error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check like",
    });
  }
};

// ==========================================
// CREATOR ANALYTICS
// ==========================================
export const getCreatorAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const videos = await video.find({
      uploader: userId,
    });

    const totalVideos = videos.length;

    const totalViews = videos.reduce(
      (total, currentVideo) =>
        total + (currentVideo.views || 0),
      0
    );

    const totalLikes = videos.reduce(
      (total, currentVideo) =>
        total + (currentVideo.Like || 0),
      0
    );

    const creator = await users
      .findById(userId)
      .select("name channelname subscribers");

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    const totalSubscribers =
      creator.subscribers?.length || 0;

    const videoPerformance = videos
      .map((currentVideo) => ({
        _id: currentVideo._id,
        title: currentVideo.videotitle,
        views: currentVideo.views || 0,
        likes: currentVideo.Like || 0,
        category: currentVideo.category,
        createdAt: currentVideo.createdAt,
        filepath: currentVideo.filepath,
      }))
      .sort((a, b) => b.views - a.views);

    return res.status(200).json({
      success: true,

      creator: {
        name: creator.name,
        channelname: creator.channelname,
      },

      analytics: {
        totalVideos,
        totalViews,
        totalLikes,
        totalSubscribers,
      },

      videoPerformance,
    });
  } catch (error) {
    console.error(
      "Creator Analytics Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch creator analytics",
    });
  }
};

// ==========================================
// GET CHANNEL VIDEOS
// ==========================================
export const getChannelVideos = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Channel ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID",
      });
    }

    const channel = await users
      .findById(userId)
      .select(
        "name channelname image description subscribers"
      );

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    const videos = await video
      .find({
        uploader: userId,
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,

      channel: {
        _id: channel._id,
        name: channel.name,
        channelname: channel.channelname,
        image: channel.image,
        description: channel.description,
        subscribers: channel.subscribers || [],
      },

      videos,
    });
  } catch (error) {
    console.error(
      "Get Channel Videos Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch channel videos",
    });
  }
};