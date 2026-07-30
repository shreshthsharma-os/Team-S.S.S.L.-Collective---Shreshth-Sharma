# Hackify — Hackathon Guide Agent

An AI-powered agent that guides hackathon teams from raw idea to winning demo.
Integrates with GitHub to monitor PRs/issues and alert on blockers in real time.

---

## Features

| Capability | Tool Used |
|---|---|
| Concept analysis + feasibility | `analyze_concept` |
| MoSCoW scope critique | `critique_scope` |
| Time-boxed build roadmap | `generate_roadmap` |
| Milestone tracking + alerts | `set_milestones` / `check_milestones` |
| Blocker & risk logging | `update_tracker` |
| GitHub PR/issue monitoring | `fetch_github_activity` |
| GitHub comment alerts | `post_github_comment` / `create_github_issue` |
| Pitch outline + timing cues | `generate_pitch_outline` |
| Live demo narration script | `generate_demo_script` |

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set environment variables

```bash
# Required
export OPENAI_API_KEY="sk-..."

# Optional — enables GitHub integration
export GITHUB_TOKEN="ghp_..."
```

On Windows (PowerShell):

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:GITHUB_TOKEN   = "ghp_..."
```

### 3. Run Hackify

```bash
# Terminal REPL
python cli.py

# Web UI at http://localhost:5000
python app.py
```

With options:

```bash
# Use a faster/cheaper model
python cli.py --model gpt-4o-mini

# Pre-set a GitHub repo for this session
python cli.py --repo owner/repo-name
```

---

## Slash Commands

| Command | Action |
|---|---|
| `/help` | Show all commands and example prompts |
| `/status` | Display current project state JSON |
| `/milestones` | Run a milestone health check |
| `/repo owner/repo` | Set active GitHub repository |
| `/reset` | Clear conversation history |
| `/exit` | Quit Hackify |

---

## Example Session

```
You: Analyze my concept: an AI meal planner for college students.
     24h hackathon, team of 4, prefer Python + React.

You: Critique our scope: user auth, meal DB, calorie tracker,
     social sharing, premium subscription tier

You: Generate a roadmap with roles: Frontend, Backend, ML Engineer, Designer

You: Set milestones for a 24h hackathon starting now

You: Generate a 2-minute pitch outline

You: Check GitHub repo myorg/meal-planner for stale PRs
```

---

## Project Structure

```
hackathon-agent/
├── agent.py              # Agentic loop (OpenAI tool-calling)
├── cli.py                # Rich REPL — main entry point
├── prompts.py            # System prompt + onboarding message
├── requirements.txt
├── tools/
│   ├── github_tools.py   # GitHub fetch/post/create/tracker
│   ├── project_tools.py  # Concept analysis, scope critique, roadmap
│   ├── milestone_tools.py# Milestone set/check/update
│   └── pitch_tools.py    # Pitch outline + demo script
└── state/
    └── project_state.json# Auto-created — persistent project state
```

---

## Architecture

```
User ──► cli.py (Rich REPL)
             │
             ▼
         agent.py (HackifyAgent)
             │  OpenAI chat.completions + tool_choice="auto"
             ▼
    ┌────────────────────────────────┐
    │        Tool Dispatcher         │
    ├────────────────────────────────┤
    │ project_tools   │ pitch_tools  │
    │ milestone_tools │ github_tools │
    └────────────────────────────────┘
             │
             ▼
    state/project_state.json   ←→   GitHub API
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ Yes | Your OpenAI API key |
| `GITHUB_TOKEN` | ⬜ Optional | GitHub Personal Access Token (enables repo tools) |
