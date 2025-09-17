const API_BASE_URL = 'https://ai-career-coach-backend-3.onrender.com';

// Declare global variables with 'let' or without initial assignment.
// They will be assigned their DOM element references *inside* onUserLoggedIn/DOMContentLoaded.
let currentUser = null; 

let welcomeMessage;
let statsRoadmapsP;
let statsResumesP;
let statsAssessmentsP;
let statsJobsP;
let logoutBtnSidebar;

// Variables for particle animation and scroll setup (declared globally, assigned in DOMContentLoaded)
let particlesContainer;
let animatedFeatureCards;

/**
 * This function will be called by auth.js when the user is confirmed to be logged in.
 * This is the primary entry point for dynamic content after authentication.
 * @param {firebase.User} user - The authenticated Firebase user object.
 */
function onUserLoggedIn(user) {
    currentUser = user;
    console.log("Home page: User logged in. UID:", currentUser.uid, "Display Name:", user.displayName);

    // --- Assign DOM Element References here, ENSURING they exist ---
    welcomeMessage = document.getElementById('welcome-message');
    statsRoadmapsP = document.getElementById('stats-roadmaps');
    statsResumesP = document.getElementById('stats-resumes');
    statsAssessmentsP = document.getElementById('stats-assessments');
    statsJobsP = document.getElementById('stats-jobs');
    logoutBtnSidebar = document.getElementById('logout-btn-sidebar'); // Get this reference here

    // Display a personalized welcome message
    if (welcomeMessage) {
        if (user && user.displayName) {
            welcomeMessage.textContent = `Welcome, ${user.displayName}!`;
        } else {
            welcomeMessage.textContent = 'Welcome!';
        }
    }

    // --- Fetch and Display Dynamic Statistics ---
    fetchAndDisplayStats();

    // --- Handle Logout ---
    const handleLogout = async () => {
        try {
            // 'auth' object is global from firebase-auth-compat.js
            await auth.signOut(); 
            console.log('User signed out successfully.');
            window.location.href = "index.html";
            // auth.js onAuthStateChanged listener handles redirection
        } catch (error) {
            console.error('Sign out error', error);
            alert("Failed to log out. Please try again.");
        }
    };

    if (logoutBtnSidebar) {
        logoutBtnSidebar.addEventListener('click', handleLogout);
    }

    // --- Navigation for Feature Cards (ensure elements are present) ---
    document.getElementById('roadmap-card')?.addEventListener('click', () => window.location.href = 'roadmap.html');
    document.getElementById('optimizer-card')?.addEventListener('click', () => window.location.href = 'optimizer.html');
    document.getElementById('assessment-card')?.addEventListener('click', () => window.location.href = 'assessment.html');
    document.getElementById('jobs-card')?.addEventListener('click', () => window.location.href = 'joblisting.html');
    document.getElementById('interview-card')?.addEventListener('click', () => window.location.href = 'interview.html');

    // After elements are initialized and event listeners set, run animations
    createParticles();
    setupScrollAnimations();
}

// --- Particle Animation (moved outside onUserLoggedIn, but called by it) ---
function createParticles() {
    particlesContainer = document.getElementById('particles'); // Assign here
    if (!particlesContainer) {
        console.warn("Particles container not found.");
        return;
    }
    particlesContainer.innerHTML = ''; // Clear existing particles if function called multiple times
    const particleCount = 40; 
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        const size = Math.random() * 6 + 2; 
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.top = `${Math.random() * 100}vh`;
        
        const duration = Math.random() * 10 + 15;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${Math.random() * 15}s`;
        
        const translateX = (Math.random() - 0.5) * 200;
        particle.style.setProperty('--translateX', `${translateX}px`);
        
        particlesContainer.appendChild(particle);
    }
}

// --- Scroll Animations for Cards (moved outside onUserLoggedIn, but called by it) ---
function setupScrollAnimations() {
    animatedFeatureCards = document.querySelectorAll('.feature-card'); // Assign here
    if (!animatedFeatureCards.length) {
        console.warn("No feature cards found for scroll animation.");
        return;
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = `${index * 0.1}s`;
                entry.target.style.animationPlayState = 'running';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    animatedFeatureCards.forEach(element => {
        element.style.animationPlayState = 'paused';
        observer.observe(element);
    });
}


/**
 * Fetches user-specific statistics from the backend and updates the UI.
 */
async function fetchAndDisplayStats() {
    if (!currentUser) {
        console.warn("fetchAndDisplayStats: No current user found.");
        // Set to N/A for visual feedback if user not logged in or currentUser is null
        if (statsRoadmapsP) statsRoadmapsP.textContent = '✨';
        if (statsResumesP) statsResumesP.textContent = '✨';
        if (statsAssessmentsP) statsAssessmentsP.textContent = '✨';
        if (statsJobsP) statsJobsP.textContent = '✨';
        return;
    }

    try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/user/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to fetch user statistics:', errorData.detail || errorData.message);
            // Fallback: Display N/A on error
            if (statsRoadmapsP) statsRoadmapsP.textContent = '✨';
            if (statsResumesP) statsResumesP.textContent = '✨';
            if (statsAssessmentsP) statsAssessmentsP.textContent = '✨';
            if (statsJobsP) statsJobsP.textContent = '✨';
            return;
        }

        const stats = await response.json();
        console.log("Fetched user stats:", stats);

        // Update DOM elements with fetched data (add null checks for safety)
        if (statsRoadmapsP) statsRoadmapsP.textContent = stats.roadmaps_generated || "✨";
        if (statsResumesP) statsResumesP.textContent = stats.resumes_optimized || "✨";
        if (statsAssessmentsP) statsAssessmentsP.textContent = stats.assessments_taken || "✨";
        if (statsJobsP) statsJobsP.textContent = stats.jobs_matched || "✨";

    } catch (error) {
        console.error('Network error or unexpected response when fetching user statistics:', error);
        // Fallback or error message for the user
        if (statsRoadmapsP) statsRoadmapsP.textContent = '✨';
        if (statsResumesP) statsResumesP.textContent = '✨';
        if (statsAssessmentsP) statsAssessmentsP.textContent = '✨';
        if (statsJobsP) statsJobsP.textContent = '✨';
    }

}

