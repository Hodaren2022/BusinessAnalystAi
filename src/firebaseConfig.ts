
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVljQ58OlrNbJ2sDkmgksvk9rdClrE3ho",
  authDomain: "businessmodelanalyst-58edb.firebaseapp.com",
  projectId: "businessmodelanalyst-58edb",
  storageBucket: "businessmodelanalyst-58edb.firebasestorage.app",
  messagingSenderId: "376699790734",
  appId: "1:376699790734:web:298dfd1bca9c61f33670df",
  measurementId: "G-Z1TLVJK8BS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// Sign in anonymously to allow Storage uploads
signInAnonymously(auth).catch((error: any) => {
  if (error.code === 'auth/configuration-not-found') {
      console.warn("Firebase Anonymous Auth is not enabled in the Console. Uploads will be skipped.");
  } else {
      console.error("Anonymous Auth Failed:", error);
  }
});

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err: any) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
    }
});
