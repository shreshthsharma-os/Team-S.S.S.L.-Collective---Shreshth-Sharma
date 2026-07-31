// State
let apiKey = localStorage.getItem('hackcoach_api_key') || '';
let apiProvider = localStorage.getItem('hackcoach_provider') || '';
let projectState = JSON.parse(localStorage.getItem('hackcoach_state')) || {
    idea: null,
    roadmap: [],
    tasks: [],
    pitch: null,
    chatHistory: [
        { role: 'model', text: "Hey! I'm your AI Hackathon Coach. Enter your idea and I'll help you plan it out. I'll also remind you if things start slipping." }
    ]
};

// DOM Elements
const modal = document.getElementById('setup-modal');
const apiKeyInput = document.getElementById('api-key-input');
const apiProviderSelect = document.getElementById('api-provider');
const providerHelp = document.getElementById('provider-help');
const saveKeyBtn = document.getElementById('save-key-btn');
const demoModeBtn = document.getElementById('demo-mode-btn');
const appContainer = document.getElementById('app-container');
const navLinks = document.querySelectorAll('.nav-links li');
const tabPanes = document.querySelectorAll('.tab-pane');
const resetBtn = document.getElementById('reset-btn');
const changeKeyBtn = document.getElementById('change-key-btn');

// Idea Form
const ideaForm = document.getElementById('idea-form');
const critiqueContainer = document.getElementById('critique-container');
const critiqueContent = document.getElementById('critique-content');

// Roadmap
const roadmapContent = document.getElementById('roadmap-content');
const roadmapLoading = document.getElementById('roadmap-loading');
const roadmapEmpty = document.getElementById('roadmap-empty');

// Tasks
const addTaskForm = document.getElementById('add-task-form');
const newTaskInput = document.getElementById('new-task-input');
const taskList = document.getElementById('task-list');
const taskEmpty = document.getElementById('task-empty');
const slippingBadge = document.getElementById('slipping-badge');

// Progress Check-in
const checkinForm = document.getElementById('checkin-form');
const checkinStatus = document.getElementById('checkin-status');
const checkinUpdate = document.getElementById('checkin-update');
const checkinBlockers = document.getElementById('checkin-blockers');
const checkinSubmitBtn = document.getElementById('checkin-submit-btn');
const checkinFeedback = document.getElementById('checkin-feedback');
const checkinFeedbackContent = document.getElementById('checkin-feedback-content');
const progressPercent = document.getElementById('progress-percent');
const progressBarFill = document.getElementById('progress-bar-fill');
const tasksDoneCount = document.getElementById('tasks-done-count');
const tasksPendingCount = document.getElementById('tasks-pending-count');
const tasksSlippingCount = document.getElementById('tasks-slipping-count');

// Pitch
const pitchContent = document.getElementById('pitch-content');
const pitchLoading = document.getElementById('pitch-loading');
const pitchEmpty = document.getElementById('pitch-empty');
const generatePitchBtn = document.getElementById('generate-pitch-btn');

// Chat
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

// Provider help text switcher
apiProviderSelect.addEventListener('change', () => {
    if (apiProviderSelect.value === 'groq') {
        providerHelp.innerHTML = 'Get a free Groq key from <a href="https://console.groq.com/keys" target="_blank">console.groq.com</a> — No credit card needed!';
    } else {
        providerHelp.innerHTML = 'Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>.';
    }
});

// Initialize
function init() {
    if (!apiKey || !apiProvider) {
        modal.classList.add('active');
    } else {
        modal.classList.remove('active');
        appContainer.classList.remove('hidden');
        renderState();
    }
}

function saveState() {
    localStorage.setItem('hackcoach_state', JSON.stringify(projectState));
}

// API Key Setup
saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    const provider = apiProviderSelect.value;
    if (key) {
        apiKey = key;
        apiProvider = provider;
        localStorage.setItem('hackcoach_api_key', apiKey);
        localStorage.setItem('hackcoach_provider', apiProvider);
        modal.classList.remove('active');
        appContainer.classList.remove('hidden');
        renderState();
    }
});

// Demo Mode
demoModeBtn.addEventListener('click', () => {
    apiKey = 'DEMO_MODE';
    apiProvider = 'demo';
    localStorage.setItem('hackcoach_api_key', apiKey);
    localStorage.setItem('hackcoach_provider', apiProvider);
    modal.classList.remove('active');
    appContainer.classList.remove('hidden');
    renderState();
});

// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const tabId = link.getAttribute('data-tab');
        tabPanes.forEach(pane => {
            pane.classList.add('hidden');
            if (pane.id === `${tabId}-tab`) {
                pane.classList.remove('hidden');
                pane.classList.add('fade-in');
            }
        });
    });
});

// Reset
resetBtn.addEventListener('click', () => {
    if(confirm("Are you sure you want to reset your project? This cannot be undone.")) {
        projectState = {
            idea: null,
            roadmap: [],
            tasks: [],
            pitch: null,
            chatHistory: [{ role: 'model', text: "Hey! I'm your AI Hackathon Coach. Enter your idea and I'll help you plan it out." }]
        };
        saveState();
        location.reload();
    }
});

// Change API Key
changeKeyBtn.addEventListener('click', () => {
    localStorage.removeItem('hackcoach_api_key');
    localStorage.removeItem('hackcoach_provider');
    apiKey = '';
    apiProvider = '';
    apiKeyInput.value = '';
    modal.classList.add('active');
    appContainer.classList.add('hidden');
});

// ========== API HELPERS ==========

// --- GROQ API ---
async function callGroq(prompt, systemInstruction) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2048
        })
    });
    
    const data = await response.json();
    if (data.error) {
        console.error("Groq API Error:", data.error);
        return `API Error: ${data.error.message}`;
    }
    return data.choices[0].message.content;
}

// --- GEMINI API (with auto-discovery) ---
let activeGeminiModel = null;

async function discoverGeminiModel() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.models) {
            const validModels = data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));
            let bestModel = validModels.find(m => m.name.includes('1.5-flash'));
            if (!bestModel) bestModel = validModels.find(m => m.name.includes('1.5-pro'));
            if (!bestModel && validModels.length > 0) bestModel = validModels[0];
            if (bestModel) {
                console.log("Auto-discovered Gemini model:", bestModel.name);
                return bestModel.name;
            }
        }
    } catch(e) {
        console.error("Failed to discover Gemini models", e);
    }
    return null;
}

async function callGeminiAPI(prompt, systemInstruction) {
    if (!activeGeminiModel) {
        activeGeminiModel = await discoverGeminiModel();
    }
    if (!activeGeminiModel) {
        return "API Error: No compatible Gemini models found for your key.";
    }
    
    const finalPrompt = `[System Instruction: ${systemInstruction}]\n\nUser Input: ${prompt}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${activeGeminiModel}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: finalPrompt }] }]
        })
    });
    
    const data = await response.json();
    if(data.error) {
        console.error("Gemini API Error:", data.error);
        return `API Error: ${data.error.message}`;
    }
    return data.candidates[0].content.parts[0].text;
}

// --- DEMO MODE ---
async function callDemo(prompt) {
    await new Promise(r => setTimeout(r, 1500));
    
    if (prompt.includes("Generate a hackathon milestone roadmap")) {
        return JSON.stringify([
            {title: "Phase 1: Setup", duration: "Hour 1-2", description: "Initialize repository, set up design system, and configure boilerplates."},
            {title: "Phase 2: Core MVP", duration: "Hour 3-14", description: "Build the primary functionality that proves your concept works."},
            {title: "Phase 3: Polish", duration: "Hour 15-20", description: "Fix glaring bugs, add glassmorphism CSS, and make it look premium."},
            {title: "Phase 4: Pitch & Demo", duration: "Hour 21-24", description: "Record your demo video and practice the 3-minute pitch outline."}
        ]);
    } else if (prompt.includes("killer 3-minute pitch")) {
        return "### 1. The Hook\nHave you ever struggled with managing time during a 24-hour hackathon? \n\n### 2. The Solution\nWe built HackCoach, an AI that automatically manages your milestones and warns you when tasks are slipping.\n\n### 3. The Demo\nAs you can see on the dashboard, the AI proactively checks off tasks and updates the roadmap in real-time.\n\n### 4. Impact & Future\nThis ensures 100% of teams cross the finish line with a working MVP. Next, we will integrate directly with GitHub.";
    } else if (prompt.includes("Provide a short, constructive critique")) {
        return "**(Demo Mode AI)**: This is a highly ambitious project! With your current team size and timeframe, I strongly suggest cutting down the \"nice-to-have\" features and focusing strictly on a single, core user flow to ensure you have a working demo for the judges.";
    } else if (prompt.includes("Here is my team's progress check-in")) {
        return "**(Demo Mode AI)**: Based on your update, it sounds like you're making steady progress. Since you have a blocker on the API, I recommend assigning one person to read the docs while the rest of the team continues building out the frontend. Don't let one bug stop your momentum!";
    } else {
        return "**(Demo Mode AI)**: Great question! In a real hackathon, I'd recommend focusing on your core user flow first. Make sure you have one solid feature working end-to-end before adding extras. Keep up the good work!";
    }
}

// --- UNIFIED CALLER ---
async function callAI(prompt, systemInstruction = "You are a Hackathon Project Coach.") {
    if (!apiKey) return "API Key not set.";
    
    try {
        if (apiProvider === 'demo' || apiKey === 'DEMO_MODE') {
            return await callDemo(prompt);
        } else if (apiProvider === 'groq') {
            return await callGroq(prompt, systemInstruction);
        } else if (apiProvider === 'gemini') {
            return await callGeminiAPI(prompt, systemInstruction);
        } else {
            return "Unknown API provider. Please reset your API key.";
        }
    } catch (e) {
        console.error("API Call Error:", e);
        return `Network Error: ${e.message}. Check your internet connection.`;
    }
}

// --- Idea & Scope ---
ideaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('project-name').value;
    const ideaText = document.getElementById('project-idea').value;
    const teamSize = document.getElementById('team-size').value;
    const timeLeft = document.getElementById('time-left').value;
    const progressSoFar = document.getElementById('progress-so-far').value.trim();
    
    const analyzeBtn = document.getElementById('analyze-idea-btn');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
    
    projectState.idea = { name, ideaText, teamSize, timeLeft, progressSoFar };
    saveState();

    // 1. Get Critique
    let critiquePrompt = `My hackathon project is called "${name}". Idea: ${ideaText}. We have a team of ${teamSize} people and ${timeLeft} hours left. `;
    if (progressSoFar) {
        critiquePrompt += `Here is what we have built so far: "${progressSoFar}". Based on this progress, how should we prioritize our remaining time to ensure a winning demo? `;
    } else {
        critiquePrompt += `We are starting from scratch. Provide a short, constructive critique on the scope. Is it too ambitious? What should we cut to ensure a working demo? `;
    }
    critiquePrompt += `Keep it brief, actionable, and punchy. Format in Markdown.`;
    
    const critiqueResult = await callAI(critiquePrompt);
    critiqueContent.innerHTML = marked.parse(critiqueResult);
    critiqueContainer.classList.remove('hidden');
    
    // 2. Generate Roadmap
    generateRoadmap(name, ideaText, timeLeft, progressSoFar);
    
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze & Generate Plan';
    generatePitchBtn.classList.remove('hidden');
    pitchEmpty.classList.add('hidden');
});

// --- Roadmap ---
async function generateRoadmap(name, idea, hours, progressSoFar) {
    roadmapEmpty.classList.add('hidden');
    roadmapContent.classList.add('hidden');
    roadmapLoading.classList.remove('hidden');
    
    let prompt = `Generate a hackathon milestone roadmap for the project "${name}": ${idea}. Total time remaining: ${hours} hours. `;
    if (progressSoFar) {
        prompt += `The team has already completed: "${progressSoFar}". The roadmap MUST start from where they are right now and focus ONLY on the remaining work for the next ${hours} hours. `;
    }
    prompt += `Output ONLY a valid JSON array of objects with keys: "title" (string), "duration" (string), "description" (string). E.g. [{"title": "Core Feature X", "duration": "Hour 1-4", "description": "Build X"}]. Ensure it's valid JSON without markdown blocks.`;
    
    const result = await callAI(prompt, "You output raw JSON arrays. Do not wrap in markdown code blocks.");
    
    try {
        const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
        const milestones = JSON.parse(cleanJson);
        projectState.roadmap = milestones;
        
        // Auto-generate some tasks based on milestones
        if(projectState.tasks.length === 0) {
            milestones.forEach(m => {
                projectState.tasks.push({ id: Date.now() + Math.random(), text: `Complete milestone: ${m.title}`, completed: false, slipping: false, createdAt: Date.now() });
            });
        }
        
        saveState();
        renderRoadmap();
        renderTasks();
    } catch(e) {
        console.error("Failed to parse roadmap JSON", e);
        roadmapLoading.classList.add('hidden');
        roadmapEmpty.classList.remove('hidden');
        roadmapEmpty.innerHTML = `<p>Failed to generate roadmap. Please try again.</p>`;
    }
}

function renderRoadmap() {
    if (!projectState.roadmap.length) return;
    
    roadmapLoading.classList.add('hidden');
    roadmapEmpty.classList.add('hidden');
    roadmapContent.classList.remove('hidden');
    
    roadmapContent.innerHTML = projectState.roadmap.map(m => `
        <div class="milestone fade-in">
            <h3>${m.title} <span style="color:var(--text-muted); font-size:0.9rem; font-weight:normal;">(${m.duration})</span></h3>
            <p>${m.description}</p>
        </div>
    `).join('');
}

// --- Tasks ---
addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = newTaskInput.value.trim();
    if(text) {
        projectState.tasks.push({
            id: Date.now(),
            text,
            completed: false,
            slipping: false,
            createdAt: Date.now()
        });
        newTaskInput.value = '';
        saveState();
        renderTasks();
    }
});

function renderTasks() {
    if (projectState.tasks.length === 0) {
        taskEmpty.classList.remove('hidden');
        taskList.innerHTML = '';
        return;
    }
    
    taskEmpty.classList.add('hidden');
    taskList.innerHTML = projectState.tasks.map(t => `
        <li class="task-item ${t.completed ? 'completed' : ''} ${t.slipping ? 'slipping' : ''}" data-id="${t.id}">
            <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask(${t.id})" />
            <span class="task-text">${t.text}</span>
            <div class="task-actions">
                <button onclick="toggleSlipping(${t.id})" title="Mark as slipping"><i class="fa-solid fa-triangle-exclamation"></i></button>
                <button onclick="deleteTask(${t.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
        </li>
    `).join('');
    
    checkSlippingBadge();
}

window.toggleTask = (id) => {
    const task = projectState.tasks.find(t => t.id === id);
    if(task) {
        task.completed = !task.completed;
        if(task.completed) task.slipping = false;
        saveState();
        renderTasks();
        updateProgressStats();
    }
};

window.toggleSlipping = (id) => {
    const task = projectState.tasks.find(t => t.id === id);
    if(task && !task.completed) {
        task.slipping = !task.slipping;
        saveState();
        renderTasks();
        updateProgressStats();
        
        // Coach intervention
        if (task.slipping) {
            addChatMessage('coach', `I noticed "${task.text}" is slipping. Do we need to cut scope here to protect the demo?`);
        }
    }
};

window.deleteTask = (id) => {
    projectState.tasks = projectState.tasks.filter(t => t.id !== id);
    saveState();
    renderTasks();
    updateProgressStats();
};

function checkSlippingBadge() {
    const slippingCount = projectState.tasks.filter(t => t.slipping).length;
    if(slippingCount > 0) {
        slippingBadge.textContent = slippingCount;
        slippingBadge.classList.remove('hidden');
    } else {
        slippingBadge.classList.add('hidden');
    }
}

function updateProgressStats() {
    const total = projectState.tasks.length;
    if (total === 0) {
        progressPercent.textContent = '0%';
        progressBarFill.style.width = '0%';
        tasksDoneCount.textContent = '0';
        tasksPendingCount.textContent = '0';
        tasksSlippingCount.textContent = '0';
        return;
    }
    
    const done = projectState.tasks.filter(t => t.completed).length;
    const slipping = projectState.tasks.filter(t => t.slipping && !t.completed).length;
    const pending = total - done;
    const percentage = Math.round((done / total) * 100);
    
    progressPercent.textContent = `${percentage}%`;
    progressBarFill.style.width = `${percentage}%`;
    tasksDoneCount.textContent = done;
    tasksPendingCount.textContent = pending;
    tasksSlippingCount.textContent = slipping;
}

// --- Progress Check-in Form ---
checkinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = checkinStatus.value;
    const updateText = checkinUpdate.value.trim();
    const blockersText = checkinBlockers.value.trim();
    
    if(!updateText && !blockersText) return;
    
    checkinSubmitBtn.disabled = true;
    checkinSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Progress...';
    checkinFeedback.classList.add('hidden');
    
    const done = projectState.tasks.filter(t => t.completed).length;
    const total = projectState.tasks.length;
    const percent = total > 0 ? Math.round((done/total)*100) : 0;
    
    const prompt = `Here is my team's progress check-in for our hackathon project "${projectState.idea ? projectState.idea.name : 'Unknown'}".
    Current Self-Reported Status: ${status}
    What we completed: ${updateText || 'Nothing specific'}
    Our blockers/concerns: ${blockersText || 'None'}
    Task completion: ${percent}% (${done}/${total} tasks)
    
    Act as our tough but helpful AI Coach. Provide a short, actionable piece of advice based on this update. If we are behind or blocked, give a concrete suggestion to cut scope or pivot. If we are ahead, suggest what to focus on next (like the pitch or polish). Format in Markdown, max 3 paragraphs.`;
    
    const result = await callAI(prompt, "You are a Hackathon Progress Coach. Be direct, actionable, and encouraging.");
    
    checkinFeedbackContent.innerHTML = marked.parse(result);
    checkinFeedback.classList.remove('hidden');
    checkinSubmitBtn.disabled = false;
    checkinSubmitBtn.innerHTML = '<i class="fa-solid fa-stethoscope"></i> Get Coach\'s Opinion';
});

// --- Pitch Builder ---
generatePitchBtn.addEventListener('click', async () => {
    if(!projectState.idea) return;
    
    generatePitchBtn.disabled = true;
    pitchContent.classList.add('hidden');
    pitchLoading.classList.remove('hidden');
    
    const prompt = `Based on the hackathon project "${projectState.idea.name}": ${projectState.idea.ideaText}. 
    Write a killer 3-minute pitch outline. Include sections for: 1. The Hook/Problem, 2. The Solution, 3. The Demo Flow, 4. Business Value/Impact. Format in Markdown.`;
    
    const result = await callAI(prompt);
    projectState.pitch = result;
    saveState();
    
    renderPitch();
    generatePitchBtn.disabled = false;
});

function renderPitch() {
    if(projectState.pitch) {
        generatePitchBtn.classList.remove('hidden');
        pitchEmpty.classList.add('hidden');
        pitchLoading.classList.add('hidden');
        pitchContent.classList.remove('hidden');
        pitchContent.innerHTML = marked.parse(projectState.pitch);
    } else if (projectState.idea) {
        generatePitchBtn.classList.remove('hidden');
        pitchEmpty.classList.add('hidden');
    }
}

// --- Chat ---
const coachStyleSelect = document.getElementById('coach-style');

function renderChat() {
    chatMessages.innerHTML = projectState.chatHistory.map(msg => `
        <div class="message ${msg.role === 'model' ? 'coach-msg' : 'user-msg'} fade-in">
            ${marked.parseInline(msg.text)}
        </div>
    `).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addChatMessage(role, text) {
    projectState.chatHistory.push({ role, text });
    saveState();
    renderChat();
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if(!text) return;
    
    addChatMessage('user', text);
    chatInput.value = '';
    
    // Simulate typing
    const typingId = Date.now();
    projectState.chatHistory.push({ role: 'model', text: '...', id: typingId });
    renderChat();
    
    // Get AI response
    const context = `Project: ${projectState.idea ? projectState.idea.name : 'Unknown'}. Tasks: ${projectState.tasks.length}. Slipping: ${projectState.tasks.filter(t=>t.slipping).length}.`;
    const prompt = `Context: ${context}\nUser says: ${text}`;
    
    // Determine Coach Persona based on dropdown
    let persona = "You are a tough but encouraging hackathon coach. Keep responses short and actionable.";
    const styleValue = coachStyleSelect.value;
    
    if (styleValue === "technical") {
        persona = "You are an expert Technical Mentor. Focus on debugging, architecture, code quality, and best practices. Keep responses short, technical, and actionable.";
    } else if (styleValue === "pitch") {
        persona = "You are a Pitch Coach. Focus on storytelling, public speaking, value proposition, and how to impress judges. Keep responses short and actionable.";
    } else if (styleValue === "product") {
        persona = "You are a Product Manager. Focus on MVP scope, user experience, feature prioritization, and cutting out non-essential work. Keep responses short and actionable.";
    }
    
    const response = await callAI(prompt, persona);
    
    // Replace typing indicator
    projectState.chatHistory = projectState.chatHistory.filter(m => m.id !== typingId);
    addChatMessage('model', response);
});

// --- Initial Render ---
function renderState() {
    if(projectState.idea) {
        document.getElementById('project-name').value = projectState.idea.name;
        document.getElementById('project-idea').value = projectState.idea.ideaText;
        document.getElementById('team-size').value = projectState.idea.teamSize;
        document.getElementById('time-left').value = projectState.idea.timeLeft;
        if(projectState.idea.progressSoFar) {
            document.getElementById('progress-so-far').value = projectState.idea.progressSoFar;
        }
        generatePitchBtn.classList.remove('hidden');
        pitchEmpty.classList.add('hidden');
    }
    renderRoadmap();
    renderTasks();
    updateProgressStats();
    renderPitch();
    renderChat();
    
    // Simulate proactive coach (e.g., checks every minute)
    setInterval(() => {
        const slippingTasks = projectState.tasks.filter(t => t.slipping && !t.completed);
        if(slippingTasks.length > 0) {
            if(Math.random() < 0.05) {
                addChatMessage('coach', `Reminder: You have ${slippingTasks.length} slipping tasks. Don't be afraid to cut scope to ensure the core demo works!`);
            }
        }
    }, 60000);
}

// Start
init();
