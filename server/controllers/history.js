import video from "../Modals/video.js";
import history from "../Modals/history.js";

// Add video to watch history
export const handlehistory = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  try {
    await history.create({
      viewer: userId,
      videoid: videoId,
    });

    await video.findByIdAndUpdate(videoId, {
      $inc: { views: 1 },
    });

    return res.status(200).json({
      history: true,
    });
  } catch (error) {
    console.error("History error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Handle video view count
export const handleview = async (req, res) => {
  const { videoId } = req.params;

  try {
    await video.findByIdAndUpdate(videoId, {
      $inc: { views: 1 },
    });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("View error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Get user's complete watch history
export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;

  try {
    const historyvideo = await history
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ createdAt: -1 })
      .exec();

    return res.status(200).json(historyvideo);
  } catch (error) {
    console.error("Get history error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Remove one video from watch history
export const removeHistoryVideo = async (req, res) => {
  const { historyId } = req.params;

  try {
    const deletedHistory = await history.findByIdAndDelete(historyId);

    if (!deletedHistory) {
      return res.status(404).json({
        success: false,
        message: "History item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Video removed from watch history",
    });
  } catch (error) {
    console.error("Remove history error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove history item",
    });
  }
};

// Clear complete watch history for a user
export const clearHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await history.deleteMany({
      viewer: userId,
    });

    return res.status(200).json({
      success: true,
      message: "Watch history cleared",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Clear history error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to clear watch history",
    });
  }
};