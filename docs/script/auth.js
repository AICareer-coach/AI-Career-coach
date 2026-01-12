// This is the core of the security guard.
// It listens for changes in the user's authentication state.
auth.onAuthStateChanged(user => {
    if (user) {
        // console.log("Auth guard: User is logged in.", user.displayName, user.uid);
        // If a function named 'onUserLoggedIn' exists on the page, call it.
        if (typeof onUserLoggedIn === "function") {
            onUserLoggedIn(user);
        }
        // Redirect authenticated users from login/index to home
        if (window.location.pathname === '/login.html' || window.location.pathname === '/' || window.location.pathname === '/index.html') {
             window.location.href = '/home.html';
        }
    } else {
        // console.log("Auth guard: No user logged in.");

        // console.log("Current window.location.pathname:", window.location.pathname);
        // If not logged in and on a protected page, redirect to index.html
        // (index.html will then guide them to login/signup)
        const protectedPaths = ['/AI-Career-coach/home.html', '/AI-Career-coach/profile.html', '/AI-Career-coach/optimizer.html', '/AI-Career-coach/roadmap.html', '/AI-Career-coach/joblisting.html','/AI-Career-coach/assessment.html','/AI-Career-coach/interview.html'];
        if (protectedPaths.includes(window.location.pathname) || (window.location.pathname.startsWith('/script') && !window.location.pathname.includes('login.js'))) {
            // console.log("Redirecting to index.html from a protected path.");
            window.location.href = '/AI-Career-coach/index.html';
        }
        // If already on index.html or login.html, do nothing (let them choose)
    }
});



