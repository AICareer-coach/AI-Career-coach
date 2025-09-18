const API_BASE_URL = 'https://ai-career-coach-backend-3.onrender.com';


document.addEventListener('DOMContentLoaded', () => {
    // This now correctly uses the base URL defined above
    const API_URL = `${API_BASE_URL}/api/interview`;

    // Views
    const level1Card = document.getElementById('level-1-card');
    const difficultyCard = document.getElementById('difficulty-card');
    const chatCard = document.getElementById('chat-card');
    const summaryCard = document.getElementById('summary-card');
    const spinner = document.getElementById('spinner-container');

    // Step 1 Elements
    const analyzeBtn = document.getElementById('analyze-btn');
    const jobDescriptionInput = document.getElementById('job-description-input');
    
    // Step 2 Elements
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');

    // Step 3 Elements
    const chatHeaderTitle = document.getElementById('chat-header-title');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const endInterviewBtn = document.getElementById('end-interview-btn');

    // Step 4 Elements
    const summaryContent = document.getElementById('summary-content');
    const restartInterviewBtn = document.getElementById('restart-interview-btn');
    
    // App State
    let jobDescription = '';
    let chatHistory = [];
    let selectedDifficulty = 'medium'; // Default

    // --- Helper Functions ---
    const showSpinner = () => spinner.style.display = 'flex';
    const hideSpinner = () => spinner.style.display = 'none';

    const addMessageToChat = (role, content) => {
        const isAI = role === 'model';
        const row = document.createElement('div');
        row.classList.add('message-row', isAI ? 'ai' : 'user');
        const avatar = document.createElement('div');
        avatar.classList.add('avatar', isAI ? 'ai' : 'user');
        const message = document.createElement('div');
        message.classList.add('message', isAI ? 'ai-message' : 'user-message');
        message.innerHTML = content.replace(/\n/g, '<br>');

        if (isAI) {
            row.appendChild(avatar);
            row.appendChild(message);
        } else {
            row.appendChild(message);
            row.appendChild(avatar);
        }

        chatMessagesContainer.appendChild(row);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    };

    // --- Step 1: Analyze Job Description ---
    analyzeBtn.addEventListener('click', () => {
        jobDescription = jobDescriptionInput.value;
        if (!jobDescription.trim()) {
            alert('Please provide a job description.');
            return;
        }
        level1Card.style.display = 'none';
        difficultyCard.style.display = 'block';
    });

    // --- Step 2: Select Difficulty and Start Interview ---
    difficultyButtons.forEach(button => {
        button.addEventListener('click', async () => {
            selectedDifficulty = button.dataset.difficulty;
            difficultyCard.style.display = 'none';
            chatCard.style.display = 'block';
            chatHeaderTitle.textContent = `AI Mock Interview (${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)})`;
            await startInterview();
        });
    });

    // --- Step 3: The Interview Chat Logic ---
    const startInterview = async () => {
        chatHistory = [];
        const firstUserMessage = "Let's begin the interview.";
        addMessageToChat('user', firstUserMessage);
        chatHistory.push({ role: 'user', content: firstUserMessage });
        await getAiResponse();
    };
    
    const getAiResponse = async () => {
        showSpinner();
        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_description: jobDescription,
                    chat_history: chatHistory,
                    difficulty: selectedDifficulty
                }),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            addMessageToChat('model', data.reply);
            chatHistory.push({ role: 'model', content: data.reply });
        } catch (error) {
            console.error("Chat Error:", error);
            addMessageToChat('model', "Sorry, an error occurred. Please try again.");
        } finally {
            hideSpinner();
        }
    };

    const handleSendUserResponse = async () => {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;
        addMessageToChat('user', userMessage);
        chatHistory.push({ role: 'user', content: userMessage });
        chatInput.value = '';
        await getAiResponse();
    };

    const handleEndInterview = async () => {
        chatCard.style.display = 'none';
        showSpinner();
        try {
            const res = await fetch(`${API_URL}/summarize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_description: jobDescription,
                    chat_history: chatHistory
                }),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const summary = await res.json();
            displaySummary(summary);
            summaryCard.style.display = 'block';
        } catch (error) {
            console.error("Summary Error:", error);
            summaryContent.innerHTML = `<p>Sorry, an error occurred while generating your feedback. Please try again.</p>`;
            summaryCard.style.display = 'block';
        } finally {
            hideSpinner();
        }
    };

    const displaySummary = (summary) => {
        let strengthsHtml = (summary.strengths || []).map(s => `<li class="strength">${s}</li>`).join('');
        let improvementsHtml = (summary.areas_for_improvement || []).map(i => `<li class="improvement">${i}</li>`).join('');

        summaryContent.innerHTML = `
            <h3>Overall Score: ${summary.overall_score || 'N/A'}/100</h3>
            
            <h3>Strengths</h3>
            <ul>${strengthsHtml || '<li>No specific strengths identified.</li>'}</ul>
            
            <h3>Areas for Improvement</h3>
            <ul>${improvementsHtml || '<li>No specific areas for improvement identified.</li>'}</ul>
            
            <div id="overall-feedback">
                <h3>Overall Feedback</h3>
                <p>${summary.overall_feedback || 'No overall feedback available.'}</p>
            </div>
        `;
    };
    
    const resetInterview = () => {
        level1Card.style.display = 'block';
        difficultyCard.style.display = 'none';
        chatCard.style.display = 'none';
        summaryCard.style.display = 'none';
        chatMessagesContainer.innerHTML = '';
        jobDescription = '';
        chatHistory = [];
        jobDescriptionInput.value = '';
    };

    sendChatBtn.addEventListener('click', handleSendUserResponse);
    chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            handleSendUserResponse();
        }
    });
    endInterviewBtn.addEventListener('click', handleEndInterview);
    restartInterviewBtn.addEventListener('click', resetInterview);

});


    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                await firebase.auth().signOut();
            } catch (error) {
                console.error("Error signing out:", error);
                alert("Failed to log out. Please try again.");
            }
        });
    }

