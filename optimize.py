"""
Newsletter optimization engine — agent-modifiable.

This is the file that evolves over time. It uses Claude Code CLI (via subprocess)
to generate improved newsletter content based on past campaign performance.

Modify the prompt strategies, content formats, and optimization logic here.
"""

import json
import subprocess
import csv
import io
from pathlib import Path


def load_results_history(results_path: str = "results.tsv", max_rows: int = 20) -> str:
    """Load recent experiment history from results.tsv as formatted text."""
    path = Path(results_path)
    if not path.exists():
        return "No previous experiments found."

    rows = []
    with open(path) as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            rows.append(row)

    # Take the most recent entries
    recent = rows[-max_rows:]
    if not recent:
        return "No previous experiments found."

    lines = ["## Past Experiment Results (most recent):"]
    for r in recent:
        status = r.get("status", "?")
        score = r.get("score", "?")
        subject = r.get("subject", "?")
        desc = r.get("description", "")
        lines.append(f"- [{status}] Score: {score} | Subject: \"{subject}\" | Strategy: {desc}")

    return "\n".join(lines)


def load_program(program_path: str = "program.md") -> str:
    """Load human-editable optimization instructions."""
    path = Path(program_path)
    if not path.exists():
        return "No program.md found. Use default optimization strategy."
    return path.read_text()


def load_template(template_path: str = "templates/base.html") -> str:
    """Load the base newsletter HTML template."""
    path = Path(template_path)
    if not path.exists():
        return "<html><body>{{ content }}</body></html>"
    return path.read_text()


def generate_improved_campaign(
    history: str,
    program: str,
    best_campaign: dict | None = None,
    template: str = "",
) -> dict:
    """
    Use Claude Code CLI to generate an improved newsletter campaign.

    Returns dict with: subject, preview_text, html_content, description
    """
    best_info = ""
    if best_campaign:
        best_info = f"""
## Current Best Campaign (baseline to beat):
- Subject: "{best_campaign.get('subject', 'N/A')}"
- Score: {best_campaign.get('score', 'N/A')}
- Open Rate: {best_campaign.get('open_rate', 'N/A')}
- Click Rate: {best_campaign.get('click_rate', 'N/A')}
- Strategy: {best_campaign.get('description', 'N/A')}
"""

    prompt = f"""You are a newsletter optimization agent. Your goal is to generate an improved newsletter campaign that beats the current best performance.

{program}

{history}

{best_info}

## Your Task

Based on the optimization instructions and past experiment results above, generate an improved newsletter campaign. Analyze what worked and what didn't from past experiments, then create something better.

You MUST respond with ONLY a valid JSON object (no markdown fences, no explanation) with these exact keys:
- "subject": The email subject line (compelling, tested against past results)
- "preview_text": The email preview/preheader text (max 150 chars)
- "html_content": The full HTML email body content (use clean, responsive HTML)
- "description": A brief description of what optimization strategy you applied (for logging)

Focus on:
1. Subject line that drives opens (based on what worked/failed before)
2. Content structure that drives clicks
3. Clear, compelling calls-to-action
4. Learning from past experiment scores

JSON response:"""

    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--output-format", "json"],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            raise Exception(f"Claude Code CLI error: {result.stderr}")

        # Parse the JSON response from Claude Code
        output = result.stdout.strip()

        # Claude Code with --output-format json wraps response in a JSON object
        try:
            claude_response = json.loads(output)
            # The actual text response is in the "result" field
            response_text = claude_response.get("result", output)
        except json.JSONDecodeError:
            response_text = output

        # Extract the campaign JSON from the response text
        campaign = _parse_campaign_json(response_text)
        return campaign

    except subprocess.TimeoutExpired:
        raise Exception("Claude Code CLI timed out after 120 seconds")
    except FileNotFoundError:
        raise Exception("Claude Code CLI ('claude') not found. Ensure it's installed and in PATH.")


def _parse_campaign_json(text: str) -> dict:
    """Parse campaign JSON from Claude's response, handling various formats."""
    # Try direct JSON parse
    try:
        data = json.loads(text)
        if "subject" in data:
            return _validate_campaign(data)
    except json.JSONDecodeError:
        pass

    # Try to find JSON block in markdown code fences
    import re
    json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            if "subject" in data:
                return _validate_campaign(data)
        except json.JSONDecodeError:
            pass

    # Try to find raw JSON object in the text
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1:
        try:
            data = json.loads(text[brace_start : brace_end + 1])
            if "subject" in data:
                return _validate_campaign(data)
        except json.JSONDecodeError:
            pass

    raise Exception(f"Failed to parse campaign JSON from response: {text[:500]}")


def _validate_campaign(data: dict) -> dict:
    """Validate and normalize campaign data."""
    required = ["subject", "preview_text", "html_content", "description"]
    for key in required:
        if key not in data:
            raise Exception(f"Missing required field: {key}")

    return {
        "subject": str(data["subject"]).strip(),
        "preview_text": str(data["preview_text"]).strip()[:150],
        "html_content": str(data["html_content"]).strip(),
        "description": str(data["description"]).strip(),
    }


if __name__ == "__main__":
    # Quick test
    history = load_results_history()
    program = load_program()
    template = load_template()

    print("History:", history[:200])
    print("Program:", program[:200])
    print("Generating improved campaign...")

    campaign = generate_improved_campaign(history, program, template=template)
    print(f"Subject: {campaign['subject']}")
    print(f"Preview: {campaign['preview_text']}")
    print(f"Strategy: {campaign['description']}")
    print(f"HTML length: {len(campaign['html_content'])} chars")
