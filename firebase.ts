
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  AuthError
} from "firebase/auth";

// ------------------------------------------------------------------
// CONFIGURATION
// Updated with your specific project keys
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyD5fQXRa69OInuQYKzwU9vB0YbGSto6PF8",
  authDomain: "rent-edge-7dca5.firebaseapp.com",
  projectId: "rent-edge-7dca5",
  storageBucket: "rent-edge-7dca5.firebasestorage.app",
  messagingSenderId: "477328355817",
  appId: "1:477328355817:web:1d17c1f501791fc9951b78",
  measurementId: "G-DFVF5STSQL" 
};

// Initialize Firebase
// Check if config is valid to avoid crashing if keys are missing
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

if (isFirebaseConfigured) {
  console.log("✅ Firebase Configured Successfully");
} else {
  console.warn("⚠️ Firebase NOT Configured. Using Mock DB. Data will not be saved to Firebase Console.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Error Mapping Helper
export const mapAuthError = (error: any): string => {
  // Handle specific Firebase Error Codes
  switch (error.code) {
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
    case 'auth/internal-error':
      return "Firebase Configuration Error: Please check services/firebase.ts and add your API Keys.";
      
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return "Password or Email Incorrect.";
      
    case 'auth/email-already-in-use':
      return "User already, exists. Sign in?";
      
    case 'auth/weak-password':
      return "Password should be at least 6 characters.";
      
    default:
      // Fallback for configuration errors that might come as raw messages
      if (error.message && error.message.includes('api-key')) {
        return "Missing API Key. Please configure services/firebase.ts";
      }
      return error.message || "An authentication error occurred.";
  }
};

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
};
