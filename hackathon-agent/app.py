"""
app.py — Flask web server that connects the Hackify UI to HackifyAgent.

Endpoints:
  GET  /              → Serves the main UI (index.html)
  POST /api/chat      → Sends a message to the agent, returns response
  GET  /api/status    → Returns current project_state.json
  POST /api/reset     → Clears the agent's conversation history
"""

import json
import os
import sys

# Force UTF-8 output on Windows (avoids cp1252 UnicodeEncodeError for emoji/arrows)
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from flask import Flask, request, jsonify, send_from_directory

from agent import HackifyAgent

app = Flask(__name__, static_folder="static", template_folder="templates")

# gpt-4o-mini: fast + high rate limits on GitHub Models free tier
# Switch to "gpt-4o" for maximum quality (lower rate limits)
_agent = HackifyAgent(model="gpt-4o-mini", verbose=True)

STATE_FILE = os.path.join(os.path.dirname(__file__), "state", "project_state.json")


@app.route("/")
def index():
    return send_from_directory("templates", "index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True)
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    try:
        response = _agent.chat(user_message)
        state = _load_state()
        return jsonify({"response": response, "state": state})
    except RuntimeError as e:
        # Missing API key or similar config error
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/status", methods=["GET"])
def status():
    return jsonify(_load_state())


@app.route("/api/reset", methods=["POST"])
def reset():
    _agent.reset()
    return jsonify({"message": "Conversation history cleared."})


def _load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {}


if __name__ == "__main__":
    if not os.getenv("GITHUB_TOKEN") and not os.getenv("OPENAI_API_KEY"):
        print("WARNING: Neither GITHUB_TOKEN nor OPENAI_API_KEY is set.")
        print("  -> Set GITHUB_TOKEN to use GitHub Models (free, no OpenAI account).")
    app.run(debug=True, port=5000)
