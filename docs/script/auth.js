const firebaseConfig = {
    apiKey: "AIzaSyDtuYr4icwQf2HsvByrCZeqbEex28lL6GI", // <--- IMPORTANT: Replace with your actual Firebase API key
    authDomain: "genaihack-240d7.firebaseapp.com",
    projectId: "genaihack-240d7",
    storageBucket: "genaihack-240d7.firebasestorage.app",
    messagingSenderId: "1095624251792",
    appId: "1:1095624251792:web:8b4be21e68c1a8bcc2bb15"
};

// Initialize Firebase if it hasn't been already
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// This is the core of the security guard.
// It listens for changes in the user's authentication state.
auth.onAuthStateChanged(user => {

  const repoPath = '/AI-Career-coach';

  // --- Get the current path and normalize it for reliable comparison ---
  let currentPath = window.location.pathname.toLowerCase(); // Convert to lowercase to avoid case issues
  // Remove trailing slash if it exists
  if (currentPath.length > 1 && currentPath.endsWith('/')) {
    currentPath = currentPath.slice(0, -1);
  }
  
    if (user) {
        console.log("Auth guard: User is logged in.", user.displayName, user.uid);
        // If a function named 'onUserLoggedIn' exists on the page, call it.
        if (typeof onUserLoggedIn === "function") {
            onUserLoggedIn(user);
        }
    // Define paths that a logged-in user should be redirected AWAY from
    const nonAuthPaths = [`${repoPath}/index.html`, `${repoPath}/login.html`, `${repoPath}/`];
    if (nonAuthPaths.includes(currentPath) || currentPath === repoPath) {
      console.log("Redirecting logged-in user to home page...");
      // Use a full URL for the redirect to be safe
      window.location.href = `${window.location.origin}${repoPath}/home.html`;
    }

  } else {
    // --- USER IS NOT LOGGED IN ---
    console.log("Auth Guard: User is LOGGED OUT.");

    // Define all pages that require a user to be logged in
    const protectedPaths = [
      `${repoPath}/home.html`,
      `${repoPath}/profile.html`,
      `${repoPath}/assessment.html`,
      `${repoPath}/optimizer.html`,
      `${repoPath}/roadmap.html`,
      `${repoPath}/joblisting.html`,
      `${repoPath}/interview.html`
    ];

    // CRITICAL DEBUGGING LOGS
    console.log("--- AUTH GUARD CHECK ---");
    console.log("Current Normalized Path:", currentPath);
    console.log("Is it a protected path?", protectedPaths.includes(currentPath));
    console.log("----------------------");

    if (protectedPaths.includes(currentPath)) {
      console.log(`Access DENIED to protected page '${currentPath}'. Redirecting...`);
      // Use a full, absolute URL for the redirect
      window.location.href = `${window.location.origin}${repoPath}/index.html`;
    }
        // If already on index.html or login.html, do nothing (let them choose)
    }
});
