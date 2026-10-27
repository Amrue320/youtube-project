
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import users from "../Modals/Auth.js";
import { firebaseAuth } from "../config/firebaseAdmin.js";

// Login using a verified Firebase account
export const login = async (req, res) => {
  const { idToken } = req.body || {};

  // 1. Check whether Firebase ID token was provided
  if (!idToken) {
    return res.status(400).json({
      code: "ID_TOKEN_REQUIRED",
      message: "Firebase ID token is required",
    });
  }

  // 2. Check whether JWT_SECRET is configured
  if (!process.env.JWT_SECRET) {
    console.error("Login configuration error: JWT_SECRET is missing");

    return res.status(500).json({
      code: "JWT_SECRET_MISSING",
      message: "JWT_SECRET is not configured on the backend",
    });
  }

  try {
    console.log("Login attempt received");

    // 3. Verify Firebase ID token
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
        message: "Firebase authentication token verification failed",
      });
    }

    if (!decodedToken?.uid) {
      console.error("Firebase token does not contain a UID");

      return res.status(401).json({
        code: "INVALID_FIREBASE_TOKEN",
        message: "Invalid Firebase authentication token",
      });
    }

    // 4. Fetch Firebase user account
    let firebaseUser;

    try {
      firebaseUser = await firebaseAuth.getUser(decodedToken.uid);
    } catch (error) {
      console.error("Firebase getUser failed:", {
        code: error.code,
        message: error.message,
      });

      return res.status(401).json({
        code: "FIREBASE_USER_LOOKUP_FAILED",
        message: "Could not retrieve the Firebase user account",
      });
    }

    // 5. Get normalized email address
    const email = firebaseUser.email?.trim().toLowerCase();

    // 6. Require a verified email
    if (!email || !firebaseUser.emailVerified) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email address before logging in.",
      });
    }

    // 7. Find existing MongoDB user
    let existingUser;

    try {
      existingUser = await users.findOne({ email });
      console.log("MongoDB user lookup completed");
    } catch (error) {
      console.error("MongoDB user lookup failed:", {
        name: error.name,
        message: error.message,
      });

      return res.status(500).json({
        code: "DATABASE_LOOKUP_FAILED",
        message: "Failed to look up the user in the database",
      });
    }

    // 8. Create user if one does not exist
    if (!existingUser) {
      try {
        existingUser = await users.create({
          email,
          name:
            firebaseUser.displayName ||
            decodedToken.name ||
            "",
          image:
            firebaseUser.photoURL ||
            decodedToken.picture ||
            "",
          role: "user",
        });

        console.log("New MongoDB user created");
      } catch (error) {
        console.error("MongoDB user creation failed:", {
          name: error.name,
          code: error.code,
          message: error.message,
        });

        return res.status(500).json({
          code: "DATABASE_USER_CREATION_FAILED",
          message: "Failed to create the user account",
        });
      }
    }

    // 9. Generate backend JWT
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
        message: "Failed to create the login token",
      });
    }

    // 10. Return successful login response
    console.log("Login successful");

    return res.status(200).json({
      result: existingUser,
      token,
    });
  } catch (error) {
    // Catch any unexpected errors
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
