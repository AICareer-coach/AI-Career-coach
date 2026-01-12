const uploadInput = document.getElementById("resume-upload");

// API base (use backend address to avoid http.server handling POST)
const API_BASE = 'https://ai-career-coach-backend-amp9.onrender.com';

// Update preview iframe when template selection changes
function setPreviewToTemplate(templateFile) {
    const previewFrame = document.getElementById('preview-frame');
    // Use a safe inline preview to avoid serving errors from backend during local dev.
    // When a real hosted URL is available (after generation) we will replace this with the hosted URL.
    const name = templateFile.replace('.html','');
    let bg = '#222';
    let accent = '#8A49FF';
    if (name.includes('modern')) { bg = 'linear-gradient(135deg,#3b3c83,#6b3fb0)'; accent = '#fff'; }
    if (name.includes('developer')) { bg = 'linear-gradient(135deg,#0f172a,#1f2937)'; accent = '#cbd5e1'; }
    if (name.includes('minimal')) { bg = 'linear-gradient(135deg,#f8fafc,#e2e8f0)'; accent = '#0f172a'; }

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Poppins,system-ui,Arial;background:${bg};display:flex;align-items:center;justify-content:center;height:100vh;color:${accent}}.card{width:90%;max-width:900px;padding:28px;border-radius:12px;background:rgba(0,0,0,0.15);backdrop-filter:blur(4px);box-shadow:inset 0 -20px 50px rgba(0,0,0,0.25)}h1{font-size:28px;margin:0 0 8px 0}p{opacity:0.85;margin:0}</style></head><body><div class="card"><h1>Preview — ${name}</h1><p>This is a local preview placeholder for the <strong>${name}</strong> template. Generate a live portfolio to view the hosted page here.</p></div></body></html>`;
    previewFrame.removeAttribute('src');
    previewFrame.srcdoc = html;
}

// initialize preview to currently selected template
// initialize preview to currently selected template and listen for template changes
const selected = document.querySelector('input[name="template_choice"]:checked');
if (selected) setPreviewToTemplate(selected.value);
document.querySelectorAll('input[name="template_choice"]').forEach(r => {
    r.addEventListener('change', (e) => setPreviewToTemplate(e.target.value));
});

uploadInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // --- NEW: Get the selected template from the UI ---
    // This assumes you added radio buttons with name="template_choice" to your HTML
    const selectedTemplate = document.querySelector('input[name="template_choice"]:checked').value;

    // Show file name in UI
    document.getElementById("file-name-display").innerText = file.name;

    const formData = new FormData();
    formData.append("file", file);

    const idToken = await firebase.auth().currentUser.getIdToken();
    
    // Show Loading
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("result").classList.add("hidden");
    
    try {
        // --- UPDATED: Added template_id to the URL ---
        const response = await fetch(`https://ai-career-coach-backend-amp9.onrender.com/api/portfolio/generate-direct?template_id=${selectedTemplate}`, {
            method: "POST",
            headers: { 'Authorization': `Bearer ${idToken}` },
            body: formData
        });
        
        if (!response.ok) throw new Error("Server error");

        const data = await response.json();
        
        // Update UI with the new hosted URL and show hosted preview
        document.getElementById("generated-url").value = data.url;
        const previewFrame = document.getElementById('preview-frame');
        // If backend returned the HTML content, use srcdoc (same-origin) so editing is possible
        if (data.html) {
            previewFrame.removeAttribute('src');
            previewFrame.srcdoc = data.html;
        } else {
            previewFrame.src = data.url;
        }
        // Show result section and scroll preview into view
        document.getElementById("result").classList.remove("hidden");
        document.querySelector('.preview-window').scrollIntoView({ behavior: 'smooth', block: 'center' });
        
    } catch (err) {
        console.error(err);
        alert("Portfolio generation failed. Please check the backend console.");
    } finally {
        document.getElementById("loading").classList.add("hidden");
    }
});

// UI Helper: Copy Link
document.getElementById("copy-btn").addEventListener("click", () => {
    const urlInput = document.getElementById("generated-url");
    urlInput.select();
    document.execCommand("copy");
    alert("URL copied to clipboard!");
});

// UI Helper: Open in New Tab
document.getElementById("open-btn").addEventListener("click", () => {
    const url = document.getElementById("generated-url").value;
    window.open(url, "_blank");
});

// UI Helper: Download HTML File
document.getElementById("download-btn").addEventListener("click", async () => {
    const portfolioUrl = document.getElementById("generated-url").value;
    
    if (!portfolioUrl) {
        alert("Please generate a portfolio first.");
        return;
    }

    try {
        // 1. Fetch the content of the generated HTML file
        const response = await fetch(portfolioUrl);
        const blob = await response.blob();
        
        // 2. Create a temporary link element
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // 3. Name the file
        a.download = 'my_career_portfolio.html';
        
        // 4. Trigger the download
        document.body.appendChild(a);
        a.click();
        
        // 5. Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (err) {
        console.error("Download failed:", err);
        alert("Failed to download the portfolio.");
    }
});

// Ensure preview updates whenever the generated URL input changes (covers other flows)
const genUrlInput = document.getElementById('generated-url');
if (genUrlInput) {
    const obs = new MutationObserver(() => {
        const url = genUrlInput.value && genUrlInput.value.trim();
        if (url) {
            const previewFrame = document.getElementById('preview-frame');
            // try to fetch the HTML (same-origin). If successful, set srcdoc to enable editing.
            fetch(url).then(r => r.text()).then(html => {
                previewFrame.removeAttribute('src');
                previewFrame.srcdoc = html;
                document.getElementById('result').classList.remove('hidden');
                document.querySelector('.preview-window').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }).catch(() => {
                try { previewFrame.removeAttribute('srcdoc'); } catch (e) {}
                previewFrame.src = url;
                document.getElementById('result').classList.remove('hidden');
                document.querySelector('.preview-window').scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    });
    // observe attribute and value changes
    obs.observe(genUrlInput, { attributes: true, attributeFilter: ['value'], childList: false, subtree: false });
}

// Handle generate button click: attempt to call profile endpoint if available, otherwise show inline preview
const generateBtn = document.getElementById('generate-btn');
if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
        // show loading
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('result').classList.add('hidden');
        // pick template
        const selectedTemplate = document.querySelector('input[name="template_choice"]:checked').value;
        try {
            // Try calling a profile-generation endpoint if available
            const idToken = await (firebase.auth().currentUser ? firebase.auth().currentUser.getIdToken() : Promise.resolve(''));
            const resp = await fetch(`${API_BASE}/api/portfolio/generate-from-profile?template_id=${selectedTemplate}`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (resp.ok) {
                const data = await resp.json();
                document.getElementById('generated-url').value = data.url;
                const previewFrame = document.getElementById('preview-frame');
                if (data.html) {
                    previewFrame.removeAttribute('src');
                    previewFrame.srcdoc = data.html;
                } else {
                    previewFrame.src = data.url;
                }
                document.getElementById('result').classList.remove('hidden');
                document.querySelector('.preview-window').scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // Fallback: show the selected template placeholder in the preview
                setPreviewToTemplate(selectedTemplate);
                alert('Profile-generation endpoint not available locally. Showing local preview.');
            }
        } catch (err) {
            console.warn('Generate from profile not available or failed:', err);
            setPreviewToTemplate(selectedTemplate);
            alert('An error occurred while generating from profile. Showing local preview.');
        } finally {
            document.getElementById('loading').classList.add('hidden');
        }
    });
}

// --- Inline editing for preview (text-only) ---
let lastPreviewUrl = null;
let lastPreviewHtml = null;
let isEditing = false;
const editBtn = document.getElementById('edit-preview-btn');
const saveBtn = document.getElementById('save-preview-btn');
const cancelBtn = document.getElementById('cancel-edit-btn');
const previewFrame = document.getElementById('preview-frame');

function canAccessPreviewDocument() {
    try {
        const doc = previewFrame.contentDocument;
        return !!doc;
    } catch (e) {
        return false;
    }
}

function enableTextEditing() {
    if (!canAccessPreviewDocument()) throw new Error('Preview not accessible (cross-origin)');
    const doc = previewFrame.contentDocument;
    // mark last preview so we can restore on cancel
    if (previewFrame.srcdoc) {
        try { lastPreviewHtml = previewFrame.contentDocument.documentElement.outerHTML; } catch(e) { lastPreviewHtml = null; }
    } else {
        lastPreviewUrl = previewFrame.src || null;
    }
    // walk elements and enable contentEditable only for elements that contain text nodes
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
    let node;
    while (node = walker.nextNode()) {
        const tag = node.tagName;
        if (['SCRIPT','STYLE','INPUT','TEXTAREA','IFRAME'].includes(tag)) continue;
        for (let i=0;i<node.childNodes.length;i++) {
            const child = node.childNodes[i];
            if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                node.setAttribute('contenteditable','true');
                node.dataset._edited = '1';
                break;
            }
        }
    }
    // small visual cue inside iframe: outline editable elements when focused
    const style = doc.createElement('style');
    style.id = '__editable_style';
    style.innerHTML = '[contenteditable] { outline: 2px dashed rgba(138,73,255,0.16); padding: 2px; }';
    doc.head.appendChild(style);
    isEditing = true;
    editBtn.classList.add('hidden'); saveBtn.classList.remove('hidden'); cancelBtn.classList.remove('hidden');
}

function disableTextEditing(keepChanges=true) {
    if (!canAccessPreviewDocument()) return;
    const doc = previewFrame.contentDocument;
    // remove contenteditable attributes but keep text changes
    const edited = doc.querySelectorAll('[data-_edited]');
    edited.forEach(el => {
        el.removeAttribute('contenteditable');
        delete el.dataset._edited;
    });
    const s = doc.getElementById('__editable_style');
    if (s) s.remove();
    isEditing = false;
    editBtn.classList.remove('hidden'); saveBtn.classList.add('hidden'); cancelBtn.classList.add('hidden');
}

if (editBtn) {
    editBtn.addEventListener('click', () => {
        try {
            if (!canAccessPreviewDocument()) { alert('Cannot enable editing: preview is cross-origin or not available.'); return; }
            enableTextEditing();
        } catch (err) {
            console.error('Edit enable failed', err);
            alert('Unable to enable inline editing.');
        }
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        // revert to last preview (reload) and disable editing flags
        if (lastPreviewHtml) {
            previewFrame.srcdoc = lastPreviewHtml;
        } else if (lastPreviewUrl) {
            previewFrame.src = lastPreviewUrl;
        }
        disableTextEditing(false);
    });
}

if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        if (!canAccessPreviewDocument()) { alert('Cannot save: preview is cross-origin or not available.'); return; }
        try {
            // disable editing attributes but keep user text
            disableTextEditing(true);
            const doc = previewFrame.contentDocument;
            // Serialize the full document
            const outer = '<!doctype html>\n' + doc.documentElement.outerHTML;

            // send to backend
            const idToken = (firebase.auth().currentUser) ? await firebase.auth().currentUser.getIdToken() : '';
            const resp = await fetch(`${API_BASE}/api/portfolio/save-edited`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` }, body: JSON.stringify({ html: outer })
            });
            if (!resp.ok) throw new Error('Save failed');
            const data = await resp.json();
            // update generated URL and preview to hosted saved copy
            document.getElementById('generated-url').value = data.url;
            if (data.html) {
                previewFrame.removeAttribute('src');
                previewFrame.srcdoc = data.html;
            } else {
                previewFrame.src = data.url;
            }
            document.getElementById('result').classList.remove('hidden');
            alert('Saved edited portfolio. You can download or share the new URL.');
        } catch (err) {
            console.error('Save failed', err);
            alert('Failed to save edited portfolio. See console for details.');
        }
    });
}
