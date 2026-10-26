
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyByzMpZ_wHTUZPeXhqlNj0AQPQWY2i_eHQ",
  authDomain: "project-15201.firebaseapp.com",
  projectId: "project-15201",
  storageBucket: "project-15201.firebasestorage.app",
  messagingSenderId: "731157357475",
  appId: "1:731157357475:web:16b3b00ad773cc36d3b016",
  measurementId: "G-B99S5CW39G",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export default app;
