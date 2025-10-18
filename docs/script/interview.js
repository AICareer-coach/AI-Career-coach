const API_BASE_URL = 'https://ai-career-coach-backend-amp9.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = `${API_BASE_URL}/api/interview`;

    // --- DOM Element References ---
    const jobDescriptionCard = document.getElementById('job-description-card');
    const difficultyCard = document.getElementById('difficulty-card');
    const startPromptCard = document.getElementById('start-prompt-card');
    const interviewCard = document.getElementById('interview-card');
    const summaryCard = document.getElementById('summary-card');
    const spinner = document.getElementById('spinner-container');
    const proceedToDifficultyBtn = document.getElementById('proceed-to-difficulty-btn');
    const jobDescriptionInput = document.getElementById('job-description-input');
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    const startInterviewBtn = document.getElementById('start-interview-btn');
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const endInterviewBtn = document.getElementById('end-interview-btn');
    const restartInterviewBtn = document.getElementById('restart-interview-btn');
    const confirmationDetails = document.getElementById('confirmation-details');
    const interviewHeaderTitle = document.getElementById('interview-header-title');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const videoPreview = document.getElementById('video-preview');
    const recordingIndicator = document.getElementById('recording-indicator');
    const summaryContent = document.getElementById('summary-content');
    const toastNotification = document.getElementById('toast-notification');
    const alertSound = new Audio('./assets/alert.mp3');
    
    // --- Application State ---
    let jobDescription = '';
    let selectedDifficulty = 'medium';
    let chatHistory = [];
    let currentQuestion = '';
    let mediaRecorder;
    let recordedChunks = [];

    // --- PROCTORING STATE ---
    let totalWarnings = 0;
    const MAX_WARNINGS = 3;
    let tabSwitchCount = 0;
    let phoneDetectionCount = 0;
    let noPersonWarningCount = 0;
    let multiplePeopleWarningCount = 0;
    let isInterviewActive = false;
    let objectDetectionModel = null;
    let proctoringAlertCooldown = false;

    // --- Helper Functions ---
    const showSpinner = () => spinner.style.display = 'flex';
    const hideSpinner = () => spinner.style.display = 'none';

    const showToast = (message, type = 'info') => {
        toastNotification.textContent = message;
        toastNotification.className = `toast show ${type}`;
        alertSound.play().catch(e => console.warn("Audio play failed:", e));
        setTimeout(() => { toastNotification.className = toastNotification.className.replace('show', ''); }, 5000);
    };

    const addMessageToChat = (role, content) => {
        const isAI = role === 'model';
        const messageRow = document.createElement('div');
        messageRow.className = `message-row ${isAI ? 'ai' : 'user'}`;
        const avatar = document.createElement('div');
        avatar.className = `avatar ${isAI ? 'ai' : 'user'}`;
        const message = document.createElement('div');
        message.className = `message ${isAI ? 'ai-message' : 'user-message'}`;
        message.innerHTML = content.replace(/\n/g, '<br>');
        messageRow.appendChild(avatar);
        messageRow.appendChild(message);
        chatMessagesContainer.appendChild(messageRow);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    };

    // --- NEW: Central Warning & Termination Logic ---
    const handleWarning = (reason) => {
        if (!isInterviewActive || proctoringAlertCooldown) return;

        totalWarnings++;
        showToast(`Warning ${totalWarnings}/${MAX_WARNINGS}: ${reason}`, 'warning');
        proctoringAlertCooldown = true;
        setTimeout(() => { proctoringAlertCooldown = false; }, 15000); // 15s global cooldown
        
        if (totalWarnings >= MAX_WARNINGS) {
            forceEndInterview(`Multiple warnings (${reason})`);
        }
    };

    const forceEndInterview = (reason) => {
        if (!isInterviewActive) return; // Prevent this from running multiple times
        
        isInterviewActive = false; // Stop all proctoring loops immediately
        showToast("Interview terminated due to multiple malpractice warnings.", 'danger');
        
        if (mediaRecorder?.state === 'recording') {
            mediaRecorder.stop();
        }
        if (videoPreview.srcObject) {
            videoPreview.srcObject.getTracks().forEach(track => track.stop());
        }

        interviewCard.style.display = 'none';
        generateSummary({ termination_reason: reason });
    };

    // --- PROCTORING LOGIC ---
    document.addEventListener('visibilitychange', () => {
        if (isInterviewActive && document.visibilityState === 'hidden') {
            tabSwitchCount++;
            handleWarning("Tab Switching");
        }
    });

    const runObjectDetection = async () => {
        if (!isInterviewActive || !objectDetectionModel) return;

        const predictions = await objectDetectionModel.detect(videoPreview);
        let personCount = 0, phoneDetected = false;
        for (let p of predictions) {
            if (p.class === 'person' && p.score > 0.6) personCount++;
            if (p.class === 'cell phone' && p.score > 0.65) phoneDetected = true;
        }

        // The handleWarning function now contains the cooldown logic
        if (phoneDetected) {
            phoneDetectionCount++;
            handleWarning("Phone Usage");
        } else if (personCount === 0) {
            noPersonWarningCount++;
            handleWarning("No Person Detected");
        } else if (personCount > 1) {
            multiplePeopleWarningCount++;
            handleWarning("Multiple People Detected");
        }

        requestAnimationFrame(runObjectDetection);
    };

    // --- Core Workflow ---
    proceedToDifficultyBtn.addEventListener('click', () => {
        jobDescription = jobDescriptionInput.value;
        if (!jobDescription.trim()) return alert('Please provide a job description.');
        jobDescriptionCard.style.display = 'none';
        difficultyCard.style.display = 'block';
    });

    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedDifficulty = button.dataset.difficulty;
            difficultyCard.style.display = 'none';
            confirmationDetails.innerHTML = `<p><strong>Difficulty:</strong> ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}</p>`;
            startPromptCard.style.display = 'block';
        });
    });

    startInterviewBtn.addEventListener('click', async () => {
        startPromptCard.style.display = 'none';
        showSpinner();
        
        if (!objectDetectionModel) {
            showToast("Initializing proctoring AI...");
            try { objectDetectionModel = await cocoSsd.load(); } 
            catch (e) { console.error("Failed to load model:", e); }
        }
        
        const hasCamera = await setupCameraAndRecorder();
        if (!hasCamera) {
            hideSpinner();
            alert("Camera and microphone access is required.");
            startPromptCard.style.display = 'block';
            return;
        }
        interviewCard.style.display = 'block';
        isInterviewActive = true;
        await beginInterviewSession();
    });

    // --- Interview Logic ---
    const setupCameraAndRecorder = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            videoPreview.srcObject = stream;
            videoPreview.addEventListener('playing', runObjectDetection);
            const options = { mimeType: 'video/webm; codecs=vp8,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) delete options.mimeType;
            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) recordedChunks.push(event.data); };
            mediaRecorder.onstop = () => {
                const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                recordedChunks = [];
                if (isInterviewActive) { // Only submit if interview hasn't been terminated
                    handleRecordingSubmission(videoBlob);
                }
            };
            return true;
        } catch (err) {
            console.error("Media Device Error:", err);
            return false;
        }
    };

    const beginInterviewSession = async () => {
        chatHistory = [];
        addMessageToChat('model', "Welcome! Your first question is being generated...");
        try {
            const initialHistory = [{ role: 'user', content: "Please start the interview with the first question." }];
            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_description: jobDescription, chat_history: initialHistory, difficulty: selectedDifficulty }),
            });
            if (!res.ok) throw new Error('Failed to get first question.');
            const data = await res.json();
            
            currentQuestion = data.reply;
            addMessageToChat('model', currentQuestion);
            recordBtn.disabled = false;
        } catch (error) {
            console.error("Start Interview Error:", error);
            addMessageToChat('model', "Sorry, an error occurred. Please restart.");
        } finally {
            hideSpinner();
        }
    };

    const handleRecordingSubmission = async (videoBlob) => {
        showSpinner();
        recordBtn.disabled = true;
        
        const formData = new FormData();
        formData.append('video_file', videoBlob, 'answer.webm');
        formData.append('question', currentQuestion);
        formData.append('job_description', jobDescription);
        
        try {
            const res = await fetch(`${API_URL}/video`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            
            chatHistory.push({ role: 'model', content: `Question: ${currentQuestion}` }, { role: 'user', content: `(Provided a spoken answer)` }, { role: 'model', content: `Feedback: ${data.feedback}` });
            addMessageToChat('model', `<strong>Feedback:</strong><br>${data.feedback}<br><br><strong>Next question:</strong><br>${data.next_question}`);
            currentQuestion = data.next_question;
            recordBtn.disabled = false;
        } catch (error) {
            console.error("Recording Submission Error:", error);
            addMessageToChat('model', "Sorry, an error occurred. Please try recording again.");
            recordBtn.disabled = false;
        } finally {
            hideSpinner();
        }
    };
    
    // --- Event Listeners ---
    recordBtn.addEventListener('click', () => {
        if (mediaRecorder?.state === 'inactive') {
            mediaRecorder.start();
            recordBtn.disabled = true; stopBtn.disabled = false; endInterviewBtn.disabled = true;
            recordingIndicator.style.display = 'block';
        }
    });

    stopBtn.addEventListener('click', () => {
        if (mediaRecorder?.state === 'recording') {
            mediaRecorder.stop();
            stopBtn.disabled = true; endInterviewBtn.disabled = false;
            recordingIndicator.style.display = 'none';
        }
    });

    const generateSummary = async (extraData = {}) => {
        showSpinner();
        try {
            const res = await fetch(`${API_URL}/summarize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    job_description: jobDescription, 
                    chat_history: chatHistory,
                    proctoring_data: { 
                        tab_switch_count: tabSwitchCount,
                        phone_detection_count: phoneDetectionCount,
                        no_person_warnings: noPersonWarningCount,
                        multiple_person_warnings: multiplePeopleWarningCount,
                        ...extraData
                    }
                }),
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const summary = await res.json();
            displaySummary(summary);
            summaryCard.style.display = 'block';
        } catch (error) {
            console.error("Summary Error:", error);
            summaryContent.innerHTML = `<p>An error occurred generating feedback.</p>`;
            summaryCard.style.display = 'block';
        } finally {
            hideSpinner();
        }
    };

    endInterviewBtn.addEventListener('click', () => {
        if (isInterviewActive) {
            isInterviewActive = false; 
            interviewCard.style.display = 'none';
            if (videoPreview.srcObject) {
                videoPreview.srcObject.getTracks().forEach(track => track.stop());
            }
            generateSummary();
        }
    });

    const displaySummary = (summary) => {
        const strengthsHtml = (summary.strengths || []).map(s => `<li class="strength">${s}</li>`).join('');
        const improvementsHtml = (summary.areas_for_improvement || []).map(i => `<li class="improvement">${i}</li>`).join('');
        summaryContent.innerHTML = `
            <h3>Overall Score: ${summary.overall_score || 'N/A'}/100</h3>
            <h3>Strengths</h3><ul>${strengthsHtml || '<li>Not identified.</li>'}</ul>
            <h3>Areas for Improvement</h3><ul>${improvementsHtml || '<li>Not identified.</li>'}</ul>
            <div id="overall-feedback"><h3>Overall Feedback</h3><p>${summary.overall_feedback || 'Not available.'}</p></div>
        `;
    };
    
    restartInterviewBtn.addEventListener('click', () => window.location.reload());
    
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try { await firebase.auth().signOut(); } 
            catch (error) { console.error("Error signing out:", error); }
        });
    }
});
