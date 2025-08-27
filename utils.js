// Firebase configuration and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy9kzppsNtMhUfBsflijHZqk4L3BQL0Fs",
  authDomain: "village-dangwar.firebaseapp.com",
  projectId: "village-dangwar",
  storageBucket: "village-dangwar.firebasestorage.app",
  messagingSenderId: "528655377784",
  appId: "1:528655377784:web:d0d1b19ef0d7f424fcd48d",
  measurementId: "G-K6HT9GMBF9"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export Firebase services for use in other modules
console.log("Firebase initialized successfully");
