"""
milestone_tools.py — Milestone tracking and blocker reminder tools.
Persists checkpoints with deadlines and detects overdue / at-risk items.
"""

import json
import os
import datetime
from typing import List, Dict, Any

STATE_FILE = os.path.join(os.path.dirname(__file__), "..", "state", "project_state.json")

# Warn when a milestone is within this fraction of its deadline
AT_RISK_THRESHOLD = 0.25  # last 25% of remaining time


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

def set_milestones(milestones: List[Dict[str, Any]]) -> str:
    """
    Saves a list of project milestones with names, deadlines, owners, and tasks.
    
    Each milestone dict should have:
        name       : str  - Milestone label
        deadline   : str  - ISO datetime string (e.g. '2025-11-02T14:00:00')
        owner      : str  - Responsible person or role
        tasks      : list[str] - Sub-tasks for this milestone
        status     : str  - 'pending' | 'in-progress' | 'done'
    """
    state = _load_state()

    # Normalise and stamp each milestone
    processed = []
    for m in milestones:
        processed.append({
            "name": m.get("name", "Unnamed Milestone"),
            "deadline": m.get("deadline", ""),
            "owner": m.get("owner", "Team"),
            "tasks": m.get("tasks", []),
            "status": m.get("status", "pending"),
            "created_at": str(datetime.datetime.now()),
        })

    state["milestones"] = processed
    _save_state(state)

    return json.dumps({
        "saved": len(processed),
        "milestones": [{"name": m["name"], "deadline": m["deadline"], "owner": m["owner"]} for m in processed],
        "message": "Milestones saved. Call check_milestones() at any time to see overdue/at-risk items.",
    }, indent=2)


def check_milestones() -> str:
    """
    Checks all stored milestones against the current time.
    Returns:
      - overdue   : milestones whose deadline has passed and status != 'done'
      - at_risk   : milestones with < 25% time remaining and status != 'done'
      - on_track  : everything else
      - completed : done milestones
    """
    state = _load_state()
    milestones = state.get("milestones", [])

    if not milestones:
        return "No milestones set yet. Call set_milestones() to add checkpoints."

    now = datetime.datetime.now()
    overdue, at_risk, on_track, completed = [], [], [], []

    for m in milestones:
        if m.get("status") == "done":
            completed.append(m["name"])
            continue

        deadline_str = m.get("deadline", "")
        if not deadline_str:
            on_track.append({"name": m["name"], "note": "No deadline set"})
            continue

        try:
            deadline = datetime.datetime.fromisoformat(deadline_str)
        except ValueError:
            on_track.append({"name": m["name"], "note": "Unparseable deadline"})
            continue

        if deadline < now:
            overdue.append({
                "name": m["name"],
                "owner": m["owner"],
                "overdue_by": str(now - deadline).split(".")[0],
                "tasks": m.get("tasks", []),
            })
        else:
            # Compute how far along we are (using created_at as start)
            try:
                created = datetime.datetime.fromisoformat(m.get("created_at", str(now)))
            except ValueError:
                created = now

            total_window = (deadline - created).total_seconds()
            remaining = (deadline - now).total_seconds()

            if total_window > 0 and (remaining / total_window) < AT_RISK_THRESHOLD:
                at_risk.append({
                    "name": m["name"],
                    "owner": m["owner"],
                    "time_left": str(deadline - now).split(".")[0],
                    "tasks": m.get("tasks", []),
                })
            else:
                on_track.append({
                    "name": m["name"],
                    "owner": m["owner"],
                    "time_left": str(deadline - now).split(".")[0],
                })

    report = {
        "checked_at": str(now),
        "summary": {
            "overdue": len(overdue),
            "at_risk": len(at_risk),
            "on_track": len(on_track),
            "completed": len(completed),
        },
        "overdue": overdue,
        "at_risk": at_risk,
        "on_track": on_track,
        "completed": completed,
    }
    return json.dumps(report, indent=2)


def update_milestone_status(milestone_name: str, status: str) -> str:
    """
    Updates the status of a named milestone.
    Valid statuses: 'pending', 'in-progress', 'done', 'blocked'.
    """
    valid_statuses = {"pending", "in-progress", "done", "blocked"}
    if status not in valid_statuses:
        return f"Invalid status '{status}'. Must be one of: {valid_statuses}"

    state = _load_state()
    milestones = state.get("milestones", [])

    matched = False
    for m in milestones:
        if m["name"].lower() == milestone_name.lower():
            m["status"] = status
            m["updated_at"] = str(datetime.datetime.now())
            matched = True
            break

    if not matched:
        return f"Milestone '{milestone_name}' not found. Available: {[m['name'] for m in milestones]}"

    state["milestones"] = milestones
    _save_state(state)
    return f"Milestone '{milestone_name}' status updated to '{status}'."


# ---------------------------------------------------------------------------
# Tool Schemas
# ---------------------------------------------------------------------------

MILESTONE_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "set_milestones",
            "description": (
                "Saves project milestones with deadlines, owners, and tasks. "
                "Call after generating a roadmap to lock in checkpoints."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "milestones": {
                        "type": "array",
                        "description": "List of milestone objects",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "deadline": {
                                    "type": "string",
                                    "description": "ISO 8601 datetime string",
                                },
                                "owner": {"type": "string"},
                                "tasks": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                                "status": {
                                    "type": "string",
                                    "enum": ["pending", "in-progress", "done", "blocked"],
                                },
                            },
                            "required": ["name", "deadline", "owner", "tasks"],
                        },
                    }
                },
                "required": ["milestones"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_milestones",
            "description": (
                "Checks all stored milestones against the current time. "
                "Returns overdue, at-risk, on-track, and completed milestone lists."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_milestone_status",
            "description": "Updates the status of a named milestone (pending/in-progress/done/blocked).",
            "parameters": {
                "type": "object",
                "properties": {
                    "milestone_name": {"type": "string"},
                    "status": {
                        "type": "string",
                        "enum": ["pending", "in-progress", "done", "blocked"],
                    },
                },
                "required": ["milestone_name", "status"],
            },
        },
    },
]

MILESTONE_TOOL_REGISTRY = {
    "set_milestones": set_milestones,
    "check_milestones": check_milestones,
    "update_milestone_status": update_milestone_status,
}
