"""
agent.py — Core agentic loop for the Hackathon Guide Agent (Hackify).

Combines all tool registries and schemas, then runs an OpenAI-powered
tool-calling loop with up to `max_turns` reasoning steps per user prompt.
"""

import json
from openai import OpenAI

from prompts import SYSTEM_PROMPT
from tools.github_tools import GITHUB_TOOLS_SCHEMA, GITHUB_TOOL_REGISTRY
from tools.project_tools import PROJECT_TOOLS_SCHEMA, PROJECT_TOOL_REGISTRY
from tools.milestone_tools import MILESTONE_TOOLS_SCHEMA, MILESTONE_TOOL_REGISTRY
from tools.pitch_tools import PITCH_TOOLS_SCHEMA, PITCH_TOOL_REGISTRY

# ---------------------------------------------------------------------------
# Unified tool registry & schema
# ---------------------------------------------------------------------------

ALL_TOOLS_SCHEMA = (
    PROJECT_TOOLS_SCHEMA
    + MILESTONE_TOOLS_SCHEMA
    + PITCH_TOOLS_SCHEMA
    + GITHUB_TOOLS_SCHEMA
)

ALL_TOOL_REGISTRY: dict = {
    **PROJECT_TOOL_REGISTRY,
    **MILESTONE_TOOL_REGISTRY,
    **PITCH_TOOL_REGISTRY,
    **GITHUB_TOOL_REGISTRY,
}


# ---------------------------------------------------------------------------
# Agent class
# ---------------------------------------------------------------------------

class HackifyAgent:
    """
    Hackathon Guide Agent powered by OpenAI tool-calling.

    Maintains conversation history across turns so the agent has full
    context of what has been analyzed, scoped, and planned so far.
    """

    def __init__(self, model: str = "gpt-4o", verbose: bool = True):
        self.model = model
        self.verbose = verbose
        self._client = None   # lazy — initialized on first chat() call
        self.messages: list = [{"role": "system", "content": SYSTEM_PROMPT}]

    # ── Public API ──────────────────────────────────────────────────────────

    @property
    def client(self):
        """Lazy OpenAI-compatible client.

        Priority:
          1. config.py  GITHUB_TOKEN  (paste directly — easiest)
          2. config.py  OPENAI_API_KEY
          3. GITHUB_TOKEN  env var
          4. OPENAI_API_KEY env var
        """
        if self._client is None:
            import os

            # Load from config.py first (direct paste), fall back to env vars
            github_token = ""
            openai_key   = ""
            try:
                import config as _cfg
                github_token = getattr(_cfg, "GITHUB_TOKEN", "").strip()
                openai_key   = getattr(_cfg, "OPENAI_API_KEY", "").strip()
                # Treat placeholder values as unset
                if github_token in ("", "paste_your_token_here", "ghp_paste_your_token_here"):
                    github_token = ""
                if openai_key in ("", "sk_paste_your_key_here"):
                    openai_key = ""
            except ImportError:
                pass

            # Fall back to environment variables
            if not github_token:
                github_token = os.getenv("GITHUB_TOKEN", "")
            if not openai_key:
                openai_key = os.getenv("OPENAI_API_KEY", "")

            if github_token:
                # GitHub Models — free, powered by your GitHub token
                self._client = OpenAI(
                    base_url="https://models.inference.ai.azure.com",
                    api_key=github_token,
                )
                if self.verbose:
                    print("[Hackify] Using GitHub Models (GITHUB_TOKEN)")
            elif openai_key:
                self._client = OpenAI(api_key=openai_key)
                if self.verbose:
                    print("[Hackify] Using OpenAI API (OPENAI_API_KEY)")
            else:
                raise RuntimeError(
                    "No token found. Open config.py and paste your GitHub token "
                    "into the GITHUB_TOKEN field, then restart the server."
                )
        return self._client

    def chat(self, user_prompt: str, max_turns: int = 15) -> str:
        """
        Sends a user message and runs the agentic loop until a final answer
        is produced or max_turns is reached.

        Returns the agent's final text response.
        """
        self.messages.append({"role": "user", "content": user_prompt})

        for turn in range(max_turns):
            self._log(f"\n── [Agent Turn {turn + 1}/{max_turns}] ──")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.messages,
                tools=ALL_TOOLS_SCHEMA,
                tool_choice="auto",
            )

            message = response.choices[0].message
            # Append as dict to keep JSON-serialisable history
            self.messages.append(self._message_to_dict(message))

            # ── Tool-calling branch ────────────────────────────────────────
            if message.tool_calls:
                for tool_call in message.tool_calls:
                    result = self._dispatch_tool(tool_call)
                    self.messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": str(result),
                    })
            else:
                # ── Final answer branch ────────────────────────────────────
                final = message.content or ""
                return final

        return "[!] Max turns reached. Please refine your request."

    def reset(self) -> None:
        """Clears conversation history (keeps system prompt)."""
        self.messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # ── Internal helpers ────────────────────────────────────────────────────

    def _dispatch_tool(self, tool_call) -> str:
        fn_name = tool_call.function.name
        try:
            fn_args = json.loads(tool_call.function.arguments)
        except json.JSONDecodeError as e:
            return f"Error parsing tool arguments: {e}"

        self._log(f"  [tool] Calling: {fn_name}({list(fn_args.keys())})")

        if fn_name in ALL_TOOL_REGISTRY:
            try:
                return ALL_TOOL_REGISTRY[fn_name](**fn_args)
            except Exception as e:
                return f"Tool execution error in {fn_name}: {e}"
        else:
            return f"Error: Tool '{fn_name}' not found in registry."

    def _message_to_dict(self, message) -> dict:
        """Converts an OpenAI ChatCompletionMessage to a plain dict."""
        d: dict = {"role": message.role}
        if message.content:
            d["content"] = message.content
        if message.tool_calls:
            d["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in message.tool_calls
            ]
        return d

    def _log(self, msg: str) -> None:
        if self.verbose:
            print(msg)
