"""
project_tools.py — Core hackathon project intelligence tools.
Handles concept analysis, scope critique, and build roadmap generation.
"""

import json
import os
import datetime
from typing import List, Dict, Any

STATE_FILE = os.path.join(os.path.dirname(__file__), "..", "state", "project_state.json")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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

def analyze_concept(
    project_name: str,
    concept: str,
    duration_hours: int,
    team_size: int,
    tech_preferences: List[str],
) -> str:
    """
    Parses a hackathon project concept and returns a structured analysis
    including: problem statement, target users, core value proposition,
    identified tech stack, and missing critical pieces.
    """
    analysis = {
        "project_name": project_name,
        "concept_summary": concept,
        "duration_hours": duration_hours,
        "team_size": team_size,
        "tech_preferences": tech_preferences,
        "analyzed_at": str(datetime.datetime.now()),
        "status": "concept_analyzed",
    }

    state = _load_state()
    state["concept"] = analysis
    _save_state(state)

    # Return structured context for the LLM to reason about
    return json.dumps({
        "instruction": (
            "You are now analyzing this hackathon project concept. "
            "Provide: (1) a crisp problem statement, (2) target users, "
            "(3) core value prop in one sentence, (4) a recommended tech stack, "
            "(5) 3-5 critical missing pieces the team needs to resolve NOW, "
            "(6) a feasibility rating out of 10 for the given duration and team size."
        ),
        "project_name": project_name,
        "concept": concept,
        "duration_hours": duration_hours,
        "team_size": team_size,
        "tech_preferences": tech_preferences,
    }, indent=2)


def critique_scope(
    project_name: str,
    features_list: List[str],
    duration_hours: int,
    team_size: int,
) -> str:
    """
    Evaluates a feature list against the hackathon timeline.
    Categorizes each feature as MUST/SHOULD/WON'T HAVE and flags scope creep.
    """
    state = _load_state()
    state["scope_critique"] = {
        "project_name": project_name,
        "features_evaluated": features_list,
        "evaluated_at": str(datetime.datetime.now()),
    }
    _save_state(state)

    return json.dumps({
        "instruction": (
            "Critically evaluate each feature for a hackathon with the given constraints. "
            "For EACH feature assign: MoSCoW priority (MUST/SHOULD/WON'T), "
            "estimated build hours (be realistic), risk level (Low/Medium/High), "
            "and a short rationale. "
            "Then write a 'Scope Health' verdict: Green/Yellow/Red and explain why. "
            "Be brutally honest — hackathons punish over-scoping."
        ),
        "project_name": project_name,
        "features": features_list,
        "duration_hours": duration_hours,
        "team_size": team_size,
        "hours_per_person": duration_hours,
        "total_team_hours": duration_hours * team_size,
    }, indent=2)


def generate_roadmap(
    project_name: str,
    concept: str,
    must_have_features: List[str],
    team_size: int,
    duration_hours: int,
    team_roles: List[str],
) -> str:
    """
    Generates a time-boxed build roadmap broken into phases.
    Each phase has tasks, owner roles, and time estimates.
    """
    phase_budgets = _compute_phase_budgets(duration_hours)

    state = _load_state()
    state["roadmap"] = {
        "project_name": project_name,
        "phases": phase_budgets,
        "team_roles": team_roles,
        "generated_at": str(datetime.datetime.now()),
    }
    _save_state(state)

    return json.dumps({
        "instruction": (
            "Generate a detailed, time-boxed hackathon roadmap. "
            "Structure it into the following phases with the given hour budgets. "
            "For each phase: list 3-6 specific actionable tasks, assign each task to a role, "
            "set a clear 'done' definition, and flag any dependency on another task. "
            "End with a 'Critical Path' section naming the 2-3 tasks that will make or break the demo."
        ),
        "project_name": project_name,
        "concept": concept,
        "must_have_features": must_have_features,
        "team_roles": team_roles,
        "team_size": team_size,
        "phase_budgets_hours": phase_budgets,
    }, indent=2)


def _compute_phase_budgets(total_hours: int) -> Dict[str, int]:
    """Splits total hackathon hours into sensible phases."""
    if total_hours <= 12:
        return {
            "Phase 1 - Setup & Architecture": max(1, int(total_hours * 0.15)),
            "Phase 2 - Core Build": max(1, int(total_hours * 0.55)),
            "Phase 3 - Integration & Demo": max(1, int(total_hours * 0.20)),
            "Phase 4 - Pitch Prep & Polish": max(1, int(total_hours * 0.10)),
        }
    elif total_hours <= 24:
        return {
            "Phase 1 - Ideation & Setup": max(1, int(total_hours * 0.10)),
            "Phase 2 - Core Feature Build": max(1, int(total_hours * 0.45)),
            "Phase 3 - Integration & MVP": max(1, int(total_hours * 0.25)),
            "Phase 4 - Polish & Buffer": max(1, int(total_hours * 0.12)),
            "Phase 5 - Pitch Prep": max(1, int(total_hours * 0.08)),
        }
    else:
        return {
            "Phase 1 - Ideation & Setup": max(2, int(total_hours * 0.08)),
            "Phase 2 - Foundation Build": max(4, int(total_hours * 0.25)),
            "Phase 3 - Core Features": max(4, int(total_hours * 0.30)),
            "Phase 4 - Integration & Testing": max(4, int(total_hours * 0.20)),
            "Phase 5 - Polish & Buffer": max(2, int(total_hours * 0.10)),
            "Phase 6 - Pitch & Demo Prep": max(2, int(total_hours * 0.07)),
        }


# ---------------------------------------------------------------------------
# Tool Schemas
# ---------------------------------------------------------------------------

PROJECT_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "analyze_concept",
            "description": (
                "Analyzes the hackathon project concept to identify problem statement, "
                "target users, value prop, tech stack, missing pieces, and feasibility score."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "concept": {
                        "type": "string",
                        "description": "Full description of the project idea",
                    },
                    "duration_hours": {
                        "type": "integer",
                        "description": "Total hackathon duration in hours",
                    },
                    "team_size": {"type": "integer", "description": "Number of team members"},
                    "tech_preferences": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Preferred languages, frameworks, or platforms",
                    },
                },
                "required": [
                    "project_name", "concept", "duration_hours", "team_size", "tech_preferences"
                ],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "critique_scope",
            "description": (
                "Evaluates a list of proposed features using MoSCoW prioritization "
                "against the hackathon timeline. Detects scope creep and returns "
                "a Scope Health verdict (Green/Yellow/Red)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "features_list": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of features/user stories the team plans to build",
                    },
                    "duration_hours": {"type": "integer"},
                    "team_size": {"type": "integer"},
                },
                "required": ["project_name", "features_list", "duration_hours", "team_size"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_roadmap",
            "description": (
                "Generates a time-boxed, phase-by-phase build roadmap for the hackathon. "
                "Each phase lists concrete tasks, owner roles, and done criteria."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string"},
                    "concept": {"type": "string"},
                    "must_have_features": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Only the MUST-HAVE features to build",
                    },
                    "team_size": {"type": "integer"},
                    "duration_hours": {"type": "integer"},
                    "team_roles": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "E.g. ['Frontend', 'Backend', 'ML Engineer', 'Designer']",
                    },
                },
                "required": [
                    "project_name", "concept", "must_have_features",
                    "team_size", "duration_hours", "team_roles"
                ],
            },
        },
    },
]

PROJECT_TOOL_REGISTRY = {
    "analyze_concept": analyze_concept,
    "critique_scope": critique_scope,
    "generate_roadmap": generate_roadmap,
}
