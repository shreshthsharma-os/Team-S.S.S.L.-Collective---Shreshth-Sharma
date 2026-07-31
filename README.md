# Team-S.S.S.L.-Collective---Shreshth-Sharma

# HackCoach 🚀

**Built by hackers, for hackers.**  
HackCoach is an AI-powered project management tool designed specifically for 24-48 hour hackathons. It acts as your team's ruthless Project Manager, helping you scope your idea, generate a milestone roadmap, track tasks, and automatically build a winning 3-minute pitch outline before the clock runs out.

Built by **SSSL COLLECTIVE**:
* Samant Kumar (25BCE11230)
* Shreshth Sharma (25BCE11231)
* Sujit Tamil Selvan (25BCE10647)
* Lavish Vishwakarma (25BCY10092)

---

## 🎯 The Problem
70% of hackathon teams fail to deliver a working demo because they:
1. Come up with impossible ideas with no build plan.
2. Suffer from scope creep (building fancy non-essentials instead of core features).
3. Fail to track slipping tasks until it's too late.
4. Throw their pitch deck together at 3 AM.

## 💡 The Solution
HackCoach fixes this by providing:
* **AI Scope Critique:** Roasts your idea and tells you exactly what to cut to ensure a working demo.
* **Milestone Roadmap:** Auto-generates a realistic timeline based on your team size and remaining hours.
* **Task Tracker & Check-ins:** Built-in task tracking that visually warns you when tasks are slipping, complete with an AI coach that gives you actionable advice on your progress.
* **Pitch Builder:** Automatically generates a structured 3-minute pitch while you code.
* **Adaptive Personas:** Switch the AI coach to Technical Mentor, Pitch Coach, or Product Manager mode based on what you need help with.

---

## 🛠️ Tech Stack
This project is built to be extremely lightweight, lightning-fast, and completely zero-dependency.
* **Frontend:** Semantic HTML5, Vanilla CSS3 (with custom animations, gradients, and canvas particles)
* **Logic:** Vanilla JavaScript (ES6+) — No React, no Node.js required.
* **State Management:** Browser LocalStorage (persists data automatically without a database).
* **AI Engine:** Groq API running Llama 3.3 70B for ultra-fast, near-instant inference (Fallback to Gemini API).

---

## 🚀 How to Run the App

Because HackCoach is a zero-dependency static web app, running it is incredibly simple. You do not need to install Node.js, Python, or any packages.

### 1. Open the App
Simply double-click the **`index.html`** file in this folder, or drag and drop it into any modern web browser (Chrome, Edge, Firefox, Brave).

### 2. Enter your API Key
When the app opens, it will ask for an API key. 
* Select **Groq** from the dropdown.
* Go to [console.groq.com/keys](https://console.groq.com/keys) to get a free API key (no credit card required).
* Paste the key into the app and click **Start Coaching**.
* *(Don't want to use an API key? Just click "Skip (Use Offline Demo Mode)" to test the UI!)*

### 3. View the Pitch Presentation
We also built a custom, fully animated HTML pitch deck! 
* Double-click the **`presentation.html`** file to open it in your browser.
* Press **F11** to go Full Screen.
* Use the **Arrow Keys** (Left/Right) to navigate through the interactive slides.
* Click the **Pencil Icon** at the bottom to enter Edit Mode and change any text on the fly!

---

## 📂 Project Structure
* `index.html` - The main dashboard and application UI.
* `style.css` - Custom CSS styling, premium animations, and cyberpunk neon theme.
* `app.js` - Application logic, state management, and AI API calls.
* `presentation.html` - Interactive 3D presentation pitch deck.
* `README.md` - You are here!

