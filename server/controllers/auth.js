
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import users from "../Modals/Auth.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";

// Login using a verified Firebase account
export const login = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      code: "ID_TOKEN_REQUIRED",
      message: "Firebase ID token is required",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "JWT_SECRET is not configured",
    });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);

    if (!decodedToken.uid) {
      return res.status(401).json({
        message: "Invalid Firebase authentication token",
      });
    }

    // Fetch the latest Firebase account status
    const firebaseUser = await firebaseAuth.getUser(decodedToken.uid);

    const email = firebaseUser.email?.trim().toLowerCase();

    // Block login until the email is verified
    if (!email || !firebaseUser.emailVerified) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email address using the verification link sent by Firebase before logging in.",
      });
    }

    // Find the existing MongoDB user
    let existingUser = await users.findOne({ email });

    // Create a user only after email verification
    if (!existingUser) {
      existingUser = await users.create({
        email,
        name: firebaseUser.displayName || decodedToken.name || "",
        image: firebaseUser.photoURL || decodedToken.picture || "",
        role: "user",
      });
    }

    // Create the backend JWT
    const token = jwt.sign(
      { userId: existingUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({
      result: existingUser,
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(401).json({
      message: "Firebase authentication failed",
    });
  }
};

// Update user profile
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({
      message: "User unavailable...",
    });
  }

  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname,
          description,
        },
      },
      { new: true }
    );

    if (!updatedata) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(updatedata);
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Subscribe or unsubscribe from a channel
export const subscribeChannel = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(id) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({
      message: "Invalid user id",
    });
  }

  try {
    const channel = await users.findById(id);
    const currentUser = await users.findById(userId);

    if (!channel || !currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const subscribed = currentUser.subscribedChannels?.some(
      (channelId) => channelId.toString() === id
    );

    if (subscribed) {
      await users.findByIdAndUpdate(userId, {
        $pull: { subscribedChannels: id },
      });

      await users.findByIdAndUpdate(id, {
        $pull: { subscribers: userId },
      });

      return res.status(200).json({ subscribed: false });
    }

    await users.findByIdAndUpdate(userId, {
      $addToSet: { subscribedChannels: id },
    });

    await users.findByIdAndUpdate(id, {
      $addToSet: { subscribers: userId },
    });

    return res.status(200).json({ subscribed: true });
  } catch (error) {
    console.error("Subscribe channel error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Check whether a user subscribes to a channel
export const checkSubscription = async (req, res) => {
  const { channelId, userId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(channelId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({
      subscribed: false,
    });
  }

  try {
    const user = await users.findById(userId);

    if (!user) {
      return res.status(404).json({
        subscribed: false,
      });
    }

    const subscribed = user.subscribedChannels?.some(
      (id) => id.toString() === channelId
    ) ?? false;

    return res.status(200).json({ subscribed });
  } catch (error) {
    console.error("Check subscription error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Get a user's subscriptions
export const getSubscriptions = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      message: "Invalid user id",
    });
  }

  try {
    const user = await users
      .findById(userId)
      .populate(
        "subscribedChannels",
        "name channelname image description subscribers"
      );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      subscriptions: user.subscribedChannels || [],
    });
  } catch (error) {
    console.error("Get subscriptions error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Get a user by ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid user id",
    });
  }

  try {
    const user = await users.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// Get public channel details
export const getChannel = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid channel id",
    });
  }

  try {
    const channel = await users
      .findById(id)
      .select("name channelname image description subscribers");

    if (!channel) {
      return res.status(404).json({
        message: "Channel not found",
      });
    }

    return res.status(200).json({ channel });
  } catch (error) {
    console.error("Get channel error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
