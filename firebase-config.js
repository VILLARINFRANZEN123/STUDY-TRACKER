// ============================================================
//   FIREBASE CONFIG — OPTIONAL (real sign-in)
//   ------------------------------------------------------------
//   By default the app uses SIMULATED sign-in (works offline,
//   stores your session in this browser only).
//
//   To enable REAL sign-in with Google / Facebook / GitHub:
//     1. Create a free project at https://console.firebase.google.com
//     2. In "Authentication" → "Sign-in method", enable
//        Google, Facebook and GitHub.
//     3. Add this project to your web app ("Web" icon) and copy
//        the firebaseConfig block Firebase gives you.
//     4. Paste it below (replace the `null`) and save this file.
//     5. Host the app on an allowlisted domain (e.g. GitHub Pages
//        or localhost). Sign-in popups don't work from file:// URLs.
//   ============================================================
window.FIREBASE_CONFIG = null;

// Example — replace the `null` above with something like this:
// window.FIREBASE_CONFIG = {
//   apiKey: "AIzaSy...",
//   authDomain: "your-project.firebaseapp.com",
//   projectId: "your-project",
//   storageBucket: "your-project.appspot.com",
//   messagingSenderId: "1234567890",
//   appId: "1:1234567890:web:abcdef"
// };