"""
cli.py — Rich-powered interactive REPL for Hackify.

Usage:
    python cli.py
    python cli.py --model gpt-4o-mini
    python cli.py --repo owner/repo
"""

import argparse
import os
import sys
import json

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.markdown import Markdown
from rich.rule import Rule
from rich.table import Table
from rich import box
from rich.text import Text

from agent import HackifyAgent
from prompts import ONBOARDING_MESSAGE

console = Console()

STATE_FILE = os.path.join(os.path.dirname(__file__), "state", "project_state.json")

# ── Visual helpers ──────────────────────────────────────────────────────────

BANNER = r"""
 _   _            _    ____        _   
| | | | __ _  ___| | _| __ )  ___ | |_ 
| |_| |/ _` |/ __| |/ /  _ \ / _ \| __|
|  _  | (_| | (__|   <| |_) | (_) | |_ 
|_| |_|\__,_|\___|_|\_\____/ \___/ \__|
                                        
  Hackathon Guide Agent  ⏱  by Hackify
"""

HELP_TEXT = """
**Available commands:**

| Command | Description |
|---|---|
| `/help` | Show this help |
| `/status` | Show current project state |
| `/milestones` | Check milestone health |
| `/reset` | Clear conversation history |
| `/repo <owner/repo>` | Set active GitHub repo |
| `/exit` or `/quit` | Exit Hackify |

Or just **talk naturally** — Hackify understands plain English.

**Example prompts:**
- *"Analyze my concept: an AI meal planner for college students, 24h hackathon, team of 4"*
- *"Critique our scope: [user auth, meal DB, calorie tracker, social sharing, premium tier]*"
- *"Generate a roadmap for the meal planner with roles: Frontend, Backend, ML"*
- *"Set milestones with deadlines for a 24h hackathon starting now"*
- *"Generate a 2-minute pitch outline"*
- *"Check GitHub repo python/typeshed for stale PRs"*
"""


def print_banner() -> None:
    console.print(Panel.fit(
        Text(BANNER, style="bold cyan"),
        border_style="cyan",
        padding=(0, 2),
    ))


def print_onboarding() -> None:
    console.print(Panel(
        Markdown(ONBOARDING_MESSAGE),
        title="[bold green]Welcome[/bold green]",
        border_style="green",
        padding=(1, 2),
    ))


def print_state() -> None:
    """Renders a summary table of the current project_state.json."""
    if not os.path.exists(STATE_FILE):
        console.print("[yellow]No project state found yet. Start by analyzing your concept.[/yellow]")
        return

    with open(STATE_FILE, "r") as f:
        state = json.load(f)

    table = Table(title="📋 Project State", box=box.ROUNDED, border_style="blue")
    table.add_column("Key", style="bold cyan", no_wrap=True)
    table.add_column("Value", style="white")

    for key, value in state.items():
        if isinstance(value, (dict, list)):
            table.add_row(key, json.dumps(value, indent=2)[:120] + "…")
        else:
            table.add_row(key, str(value))

    console.print(table)


def print_response(text: str) -> None:
    """Renders the agent's markdown response in a styled panel."""
    console.print(Panel(
        Markdown(text),
        title="[bold magenta]🤖 Hackify[/bold magenta]",
        border_style="magenta",
        padding=(1, 2),
    ))


def print_help() -> None:
    console.print(Panel(
        Markdown(HELP_TEXT),
        title="[bold yellow]Help[/bold yellow]",
        border_style="yellow",
        padding=(1, 2),
    ))


# ── REPL ────────────────────────────────────────────────────────────────────

def run_repl(model: str, default_repo: str | None) -> None:
    print_banner()
    print_onboarding()

    if not os.getenv("OPENAI_API_KEY"):
        console.print(Panel(
            "[bold red]⚠  OPENAI_API_KEY is not set.[/bold red]\n"
            "Set it with: [cyan]export OPENAI_API_KEY='sk-...'[/cyan]",
            border_style="red",
        ))
        sys.exit(1)

    agent = HackifyAgent(model=model, verbose=True)
    active_repo: str | None = default_repo

    if active_repo:
        console.print(f"[dim]Active GitHub repo: [cyan]{active_repo}[/cyan][/dim]")

    console.print(Rule(style="dim"))

    while True:
        try:
            user_input = Prompt.ask("\n[bold green]You[/bold green]").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[yellow]Goodbye! Good luck with your hack! 🚀[/yellow]")
            break

        if not user_input:
            continue

        # ── Slash commands ──────────────────────────────────────────────────
        lower = user_input.lower()

        if lower in ("/exit", "/quit"):
            console.print("[yellow]Goodbye! Good luck with your hack! 🚀[/yellow]")
            break

        elif lower == "/help":
            print_help()
            continue

        elif lower == "/status":
            print_state()
            continue

        elif lower == "/milestones":
            # Inject a milestone check directly
            console.print("[dim]Checking milestones…[/dim]")
            response = agent.chat("Check all milestones and give me a clear health report.")
            print_response(response)
            continue

        elif lower == "/reset":
            agent.reset()
            console.print("[green]✓ Conversation history cleared.[/green]")
            continue

        elif lower.startswith("/repo "):
            active_repo = user_input[6:].strip()
            console.print(f"[green]✓ Active repo set to:[/green] [cyan]{active_repo}[/cyan]")
            continue

        # ── Inject repo context if set ──────────────────────────────────────
        prompt = user_input
        if active_repo and "repo" not in lower and "github" not in lower:
            # Silently attach repo context so agent can reference it
            prompt = f"[Active repo: {active_repo}]\n{user_input}"

        # ── Agent turn ───────────────────────────────────────────────────────
        console.print(Rule(style="dim"))
        with console.status("[bold cyan]Hackify is thinking…[/bold cyan]", spinner="dots"):
            pass  # spinner for UX — real work happens below

        response = agent.chat(prompt)
        print_response(response)
        console.print(Rule(style="dim"))


# ── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Hackify — Hackathon Guide Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--model",
        default="gpt-4o",
        help="OpenAI model to use (default: gpt-4o)",
    )
    parser.add_argument(
        "--repo",
        default=None,
        help="Default GitHub repo (owner/repo) for this session",
    )
    args = parser.parse_args()

    run_repl(model=args.model, default_repo=args.repo)


if __name__ == "__main__":
    main()
