
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import users from "../Modals/Auth.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";

// Login using a verified Firebase account

export const login = async (req, res) => {
  const { idToken } = req.body || {};

  if (!idToken) {
    return res.status(400).json({
      code: "ID_TOKEN_REQUIRED",
      message: "Firebase ID token is required",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("Login error: JWT_SECRET is missing");

    return res.status(500).json({
      code: "JWT_SECRET_MISSING",
      message: "JWT_SECRET is not configured",
    });
  }

  try {
    console.log("Login attempt received");

    // Verify Firebase ID token
    let decodedToken;

    try {
      decodedToken = await firebaseAuth.verifyIdToken(idToken);
      console.log("Firebase ID token verified successfully");
    } catch (error) {
      console.error("Firebase token verification failed:", {
        code: error.code,
        message: error.message,
      });

      return res.status(401).json({
        code: "FIREBASE_TOKEN_VERIFICATION_FAILED",
        message: "Firebase token verification failed",
      });
    }

    if (!decodedToken?.uid) {
      return res.status(401).json({
        code: "INVALID_FIREBASE_TOKEN",
        message: "Invalid Firebase authentication token",
      });
    }

    // Retrieve Firebase user
    let firebaseUser;

    try {
      firebaseUser = await firebaseAuth.getUser(decodedToken.uid);
    } catch (error) {
      console.error("Firebase user lookup failed:", {
        code: error.code,
        message: error.message,
      });

      return res.status(500).json({
        code: "FIREBASE_USER_LOOKUP_FAILED",
        message: "Could not retrieve the Firebase user",
      });
    }

    const email = firebaseUser.email?.trim().toLowerCase();

    if (!email || !firebaseUser.emailVerified) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address before logging in.",
      });
    }

    // Find or create MongoDB user
    let existingUser;

    try {
      existingUser = await users.findOne({ email });

      if (!existingUser) {
        existingUser = await users.create({
          email,
          name: firebaseUser.displayName || decodedToken.name || "",
          image: firebaseUser.photoURL || decodedToken.picture || "",
          role: "user",
        });

        console.log("New MongoDB user created");
      }

      console.log("MongoDB user lookup completed");
    } catch (error) {
      console.error("MongoDB operation failed:", {
        name: error.name,
        code: error.code,
        message: error.message,
      });

      return res.status(500).json({
        code: "DATABASE_OPERATION_FAILED",
        message: "A database operation failed during login",
      });
    }

    // Generate backend JWT
    let token;

    try {
      token = jwt.sign(
        { userId: existingUser._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );
    } catch (error) {
      console.error("JWT generation failed:", {
        name: error.name,
        message: error.message,
      });

      return res.status(500).json({
        code: "JWT_GENERATION_FAILED",
        message: "Could not generate the login token",
      });
    }

    console.log("Login successful");

    return res.status(200).json({
      result: existingUser,
      token,
    });
  } catch (error) {
    console.error("Unexpected login error:", {
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      code: "INTERNAL_LOGIN_ERROR",
      message: "An unexpected error occurred during login",
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
