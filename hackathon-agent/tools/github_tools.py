"""
github_tools.py — GitHub integration tools (ported from user-provided code).
Handles fetching repo activity, posting comments, and updating the local tracker.
"""

import json
import os
import datetime
from typing import List

from github import Github, Auth

# ---------------------------------------------------------------------------
# GitHub Client Initialization
# ---------------------------------------------------------------------------
# Load token from config.py first, then env var
_token_from_config = ""
try:
    import config as _cfg
    _token_from_config = getattr(_cfg, "GITHUB_TOKEN", "").strip()
    if _token_from_config in ("paste_your_token_here", "ghp_paste_your_token_here"):
        _token_from_config = ""
except ImportError:
    pass

GITHUB_TOKEN = _token_from_config or os.getenv("GITHUB_TOKEN", "")
_gh_auth  = Auth.Token(GITHUB_TOKEN) if GITHUB_TOKEN else None
gh_client = Github(auth=_gh_auth)   if _gh_auth    else None

STATE_FILE = os.path.join(os.path.dirname(__file__), "..", "state", "project_state.json")


# ---------------------------------------------------------------------------
# Tool Implementations
# ---------------------------------------------------------------------------

def fetch_github_activity(repo_name: str) -> str:
    """Fetches open Pull Requests and Issues from a target GitHub repository."""
    if not gh_client:
        return "Error: GITHUB_TOKEN is not set in environment variables."

    try:
        repo = gh_client.get_repo(repo_name)

        # Fetch open PRs
        pulls = repo.get_pulls(state="open")
        pr_list = []
        for pr in pulls:
            pr_list.append({
                "pr_number": pr.number,
                "title": pr.title,
                "author": pr.user.login,
                "created_at": str(pr.created_at),
                "is_draft": pr.draft,
                "html_url": pr.html_url,
            })

        # Fetch open Issues (filter PRs out)
        issues = repo.get_issues(state="open")
        issue_list = []
        for issue in issues:
            if not issue.pull_request:
                issue_list.append({
                    "issue_number": issue.number,
                    "title": issue.title,
                    "assignee": issue.assignee.login if issue.assignee else "Unassigned",
                    "labels": [label.name for label in issue.labels],
                    "html_url": issue.html_url,
                })

        result = {
            "repository": repo_name,
            "open_pull_requests_count": len(pr_list),
            "pull_requests": pr_list,
            "open_issues_count": len(issue_list),
            "issues": issue_list,
        }
        return json.dumps(result, indent=2)

    except Exception as e:
        return f"GitHub API Error: {str(e)}"


def post_github_comment(repo_name: str, issue_number: int, comment_body: str) -> str:
    """Posts an issue or PR comment to alert the team about blockers or slipping tasks."""
    if not gh_client:
        return "Error: GITHUB_TOKEN is not set in environment variables."

    try:
        repo = gh_client.get_repo(repo_name)
        issue = repo.get_issue(number=issue_number)
        issue.create_comment(comment_body)
        return f"Successfully posted warning comment to Issue/PR #{issue_number}."
    except Exception as e:
        return f"GitHub API Error: {str(e)}"


def create_github_issue(repo_name: str, title: str, body: str, labels: List[str]) -> str:
    """Creates a new GitHub issue for tracking a milestone, blocker, or risk."""
    if not gh_client:
        return "Error: GITHUB_TOKEN is not set in environment variables."

    try:
        repo = gh_client.get_repo(repo_name)
        # Ensure labels exist; create missing ones
        existing_labels = [lbl.name for lbl in repo.get_labels()]
        label_objects = []
        for lbl_name in labels:
            if lbl_name not in existing_labels:
                repo.create_label(name=lbl_name, color="e4e669")
            label_objects.append(repo.get_label(lbl_name))

        issue = repo.create_issue(title=title, body=body, labels=label_objects)
        return f"Created issue #{issue.number}: {issue.html_url}"
    except Exception as e:
        return f"GitHub API Error: {str(e)}"


def update_tracker(blockers: List[str], risks: List[str], slipping_tasks: List[str]) -> str:
    """Tracks active blockers, architectural risks, and slipping deliverables locally."""
    state: dict = {}
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            state = json.load(f)

    state["blockers"] = blockers
    state["risks"] = risks
    state["slipping_tasks"] = slipping_tasks
    state["last_updated"] = str(datetime.datetime.now())

    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

    return "Project risk and blocker tracker updated successfully."


# ---------------------------------------------------------------------------
# Tool Schemas (OpenAI function-calling format)
# ---------------------------------------------------------------------------

GITHUB_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "fetch_github_activity",
            "description": (
                "Inspects a target GitHub repository to read active PRs, branches, and issues. "
                "Use this to detect stale or blocked work items."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "repo_name": {
                        "type": "string",
                        "description": "Owner/repo string (e.g. 'octocat/Hello-World')",
                    }
                },
                "required": ["repo_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "post_github_comment",
            "description": "Posts a blocker, risk warning, or status comment on a specific GitHub issue or PR.",
            "parameters": {
                "type": "object",
                "properties": {
                    "repo_name": {"type": "string", "description": "Owner/repo string"},
                    "issue_number": {"type": "integer", "description": "Issue or PR number"},
                    "comment_body": {"type": "string", "description": "Markdown comment text"},
                },
                "required": ["repo_name", "issue_number", "comment_body"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_github_issue",
            "description": "Creates a new GitHub issue for a milestone, blocker, or risk item.",
            "parameters": {
                "type": "object",
                "properties": {
                    "repo_name": {"type": "string"},
                    "title": {"type": "string", "description": "Issue title"},
                    "body": {"type": "string", "description": "Detailed markdown body"},
                    "labels": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Label names (e.g. ['blocker', 'hackathon'])",
                    },
                },
                "required": ["repo_name", "title", "body", "labels"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_tracker",
            "description": "Logs active blockers, technical risks, and slipping tasks to local state.",
            "parameters": {
                "type": "object",
                "properties": {
                    "blockers": {"type": "array", "items": {"type": "string"}},
                    "risks": {"type": "array", "items": {"type": "string"}},
                    "slipping_tasks": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["blockers", "risks", "slipping_tasks"],
            },
        },
    },
]

GITHUB_TOOL_REGISTRY = {
    "fetch_github_activity": fetch_github_activity,
    "post_github_comment": post_github_comment,
    "create_github_issue": create_github_issue,
    "update_tracker": update_tracker,
}
