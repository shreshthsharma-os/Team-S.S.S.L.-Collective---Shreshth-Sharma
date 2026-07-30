"""
pitch_tools.py — Pitch outline and demo script generation tools.
Produces structured 2-minute pitch outlines and judges' FAQ prep.
"""

import json
import os
import datetime

STATE_FILE = os.path.join(os.path.dirname(__file__), "..", "state", "project_state.json")


def _load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {}


def _save_state(state: dict) -> None:
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


# ---------------------------------------------------------------------------
# Tool Implementations
# ---------------------------------------------------------------------------

def generate_pitch_outline(
    project_name: str,
    one_liner: str,
    problem: str,
    solution: str,
    tech_stack: list,
    demo_flow: str,
    target_users: str,
    impact_metric: str,
    ask: str,
    duration_seconds: int = 120,
) -> str:
    """
    Generates a structured pitch outline with timing cues for a hackathon demo.
    
    Returns a prompt payload that the LLM will use to produce the final outline.
    The structure follows: Hook → Problem → Solution → Demo → Tech → Impact → Ask.
    """
    state = _load_state()
    state["pitch"] = {
        "project_name": project_name,
        "one_liner": one_liner,
        "generated_at": str(datetime.datetime.now()),
    }
    _save_state(state)

    time_per_section = _allocate_pitch_time(duration_seconds)

    return json.dumps({
        "instruction": (
            "Generate a polished, compelling hackathon pitch outline with precise timing cues. "
            "For each section: write 2-3 bullet talking points, suggest a delivery tip, "
            "and include a smooth transition to the next section. "
            "Make the Hook punchy (start with a bold statistic or story). "
            "For the Demo section, write a step-by-step narration script. "
            "End with a clear, confident Ask. "
            "Also generate 5 likely judges' questions with ideal answers."
        ),
        "project_name": project_name,
        "one_liner": one_liner,
        "sections": {
            "Hook": {"seconds": time_per_section["hook"], "content": f"Open with impact about: {problem}"},
            "Problem": {"seconds": time_per_section["problem"], "content": problem},
            "Solution": {"seconds": time_per_section["solution"], "content": solution},
            "Live Demo": {"seconds": time_per_section["demo"], "demo_flow": demo_flow},
            "Tech Stack": {"seconds": time_per_section["tech"], "stack": tech_stack},
            "Impact & Traction": {"seconds": time_per_section["impact"], "metric": impact_metric, "users": target_users},
            "The Ask": {"seconds": time_per_section["ask"], "ask": ask},
        },
        "total_seconds": duration_seconds,
    }, indent=2)


def generate_demo_script(
    project_name: str,
    demo_steps: list,
    fallback_plan: str,
) -> str:
    """
    Generates a detailed live demo narration script with a fallback plan
    in case of technical failures during the presentation.
    """
    state = _load_state()
    state["demo_script"] = {
        "project_name": project_name,
        "steps": demo_steps,
        "generated_at": str(datetime.datetime.now()),
    }
    _save_state(state)

    return json.dumps({
        "instruction": (
            "Write a confident, detailed live demo narration script. "
            "For each step: write the exact words the presenter should say, "
            "the UI action to perform, and what to highlight. "
            "Include a 'What to do if it breaks' note after each critical step. "
            "End with a polished fallback plan if the live demo completely fails."
        ),
        "project_name": project_name,
        "demo_steps": demo_steps,
        "fallback_plan": fallback_plan,
    }, indent=2)


def _allocate_pitch_time(total_seconds: int) -> dict:
    """Distributes pitch time proportionally across sections."""
    return {
        "hook": max(10, int(total_seconds * 0.08)),
        "problem": max(15, int(total_seconds * 0.15)),
        "solution": max(20, int(total_seconds * 0.18)),
        "demo": max(30, int(total_seconds * 0.35)),
        "tech": max(10, int(total_seconds * 0.08)),
        "impact": max(15, int(total_seconds * 0.10)),
        "ask": max(10, int(total_seconds * 0.06)),
    }


# ---------------------------------------------------------------------------
# Tool Schemas
# ---------------------------------------------------------------------------

PITCH_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "generate_pitch_outline",
            "description": (
                "Produces a structured hackathon pitch outline with timing cues for each section "
                "(Hook → Problem → Solution → Demo → Tech → Impact → Ask) "
                "and 5 judges' Q&A pairs."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "one_liner": {
                        "type": "string",
                        "description": "One-sentence description of the project",
                    },
                    "problem": {
                        "type": "string",
                        "description": "The core problem being solved",
                    },
                    "solution": {
                        "type": "string",
                        "description": "How the project solves it",
                    },
                    "tech_stack": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Technologies used",
                    },
                    "demo_flow": {
                        "type": "string",
                        "description": "Step-by-step description of what the demo shows",
                    },
                    "target_users": {
                        "type": "string",
                        "description": "Who benefits from this project",
                    },
                    "impact_metric": {
                        "type": "string",
                        "description": "Key metric that demonstrates value (e.g. '40% faster')",
                    },
                    "ask": {
                        "type": "string",
                        "description": "What the team is asking for (prize, mentorship, etc.)",
                    },
                    "duration_seconds": {
                        "type": "integer",
                        "description": "Total pitch duration in seconds (default 120)",
                    },
                },
                "required": [
                    "project_name", "one_liner", "problem", "solution",
                    "tech_stack", "demo_flow", "target_users", "impact_metric", "ask"
                ],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_demo_script",
            "description": (
                "Generates a word-for-word live demo narration script with step-by-step actions "
                "and a fallback plan in case of technical failures."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "demo_steps": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Ordered list of demo actions (e.g. 'User logs in', 'Upload image')",
                    },
                    "fallback_plan": {
                        "type": "string",
                        "description": "What to do/say if the live demo fails (e.g. 'Show screenshots')",
                    },
                },
                "required": ["project_name", "demo_steps", "fallback_plan"],
            },
        },
    },
]

PITCH_TOOL_REGISTRY = {
    "generate_pitch_outline": generate_pitch_outline,
    "generate_demo_script": generate_demo_script,
}
