import watchlater from "../Modals/watchlater.js";

export const handlewatchlater = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  try {
    const exisitingwatchlater =
      await watchlater.findOne({
        viewer: userId,
        videoid: videoId,
      });

    if (exisitingwatchlater) {
      await watchlater.findByIdAndDelete(
        exisitingwatchlater._id
      );

      return res.status(200).json({
        watchlater: false,
      });
    } else {
      await watchlater.create({
        viewer: userId,
        videoid: videoId,
      });

      return res.status(200).json({
        watchlater: true,
      });
    }
  } catch (error) {
    console.error("Watch Later error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Check Watch Later status
export const checkwatchlater = async (
  req,
  res
) => {
  const { videoId, userId } = req.params;

  try {
    const existingWatchLater =
      await watchlater.findOne({
        viewer: userId,
        videoid: videoId,
      });

    return res.status(200).json({
      watchlater: Boolean(existingWatchLater),
    });
  } catch (error) {
    console.error(
      "Check Watch Later error:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getallwatchlater = async (
  req,
  res
) => {
  const { userId } = req.params;

  try {
    const watchlatervideo =
      await watchlater
        .find({ viewer: userId })
        .populate({
          path: "videoid",
          model: "videofiles",
        })
        .exec();

    return res.status(200).json(
      watchlatervideo
    );
  } catch (error) {
    console.error(
      "Get Watch Later error:",
      error
    );

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};