
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  reload,
} from "firebase/auth";

import {
  useState,
  createContext,
  useEffect,
  useContext,
} from "react";

import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const login = (userdata, token) => {
    const updatedUser = { ...userdata, token };

    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("token", token);
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const logout = async () => {
    clearSession();

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
      throw error;
    }
  };

  // Verify email status before creating a backend session.
  const sendFirebaseTokenToBackend = async (firebaseUser) => {
    await reload(firebaseUser);

    if (!firebaseUser.emailVerified) {
      clearSession();

      const error = new Error(
        "Please verify your email before logging in. Check your inbox."
      );

      error.code = "auth/email-not-verified";
      throw error;
    }

    const idToken = await firebaseUser.getIdToken(true);

    const response = await axiosInstance.post("/user/login", {
      idToken,
    });

    const { result, token } = response.data;

    if (!result || !token) {
      throw new Error("Backend did not return a user and JWT.");
    }

    login(result, token);
    return result;
  };

  // Google sign-in remains available.
  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      return await sendFirebaseTokenToBackend(result.user);
    } catch (error) {
      console.error("Google sign-in failed:", error);
      throw error;
    }
  };

  // Create an email/password account and send a verification email.
  const signupWithEmail = async (email, password) => {
    const result = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    try {
      await sendEmailVerification(result.user);
    } catch (error) {
      // Keep the Firebase account so verification can be resent.
      throw error;
    }

    clearSession();

    return {
      message:
        "Verification email sent. Check your inbox and spam folder, then verify your email before logging in.",
    };
  };

  // Email/password login.
  const loginWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    return await sendFirebaseTokenToBackend(result.user);
  };

  // Resend the verification email for the current Firebase user.
  const resendVerificationEmail = async () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      throw new Error(
        "Please sign in with your email and password before resending verification."
      );
    }

    await reload(firebaseUser);

    if (firebaseUser.emailVerified) {
      return {
        message: "Your email is already verified. You can continue to log in.",
      };
    }

    await sendEmailVerification(firebaseUser);

    return {
      message:
        "Verification email sent. Check your inbox and spam folder.",
    };
  };

  // Refresh verification status and complete login.
  const verifyEmailAndContinue = async () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      throw new Error(
        "Please sign in with your email and password, then try again."
      );
    }

    await reload(firebaseUser);

    if (!firebaseUser.emailVerified) {
      const error = new Error(
        "Your email is not verified yet. Open the verification link first."
      );

      error.code = "auth/email-not-verified";
      throw error;
    }

    return await sendFirebaseTokenToBackend(firebaseUser);
  };

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          clearSession();
          return;
        }

        await sendFirebaseTokenToBackend(firebaseUser);
      } catch (error) {
        clearSession();

        if (
          error.code !== "auth/email-not-verified" &&
          active
        ) {
          console.error("Backend authentication failed:", error);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        authLoading,
        login,
        logout,
        handlegooglesignin,
        signupWithEmail,
        loginWithEmail,
        resendVerificationEmail,
        verifyEmailAndContinue,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
