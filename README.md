# newsletter-autoresearch

Self-improving newsletter optimization system inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch).

Uses a hill-climbing loop: analyze campaign metrics → generate improved content via Claude → create draft → evaluate → keep or discard.

## Architecture

| File | Role | Modifiable? |
|------|------|-------------|
| `optimize.py` | Claude-powered content generation | Yes (agent) |
| `mailerlite_client.py` | MailerLite API wrapper | No |
| `evaluate.py` | Metric scoring logic | No |
| `run.py` | Orchestrator | No |
| `program.md` | Optimization instructions | Yes (human) |

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MailerLite API key
```

## Usage

```bash
# Check current status
python run.py status

# Generate an improved campaign draft
python run.py generate

# Evaluate pending campaigns (collect metrics)
python run.py evaluate

# Send an approved draft
python run.py send --campaign-id <ID>
```

## GitHub Actions

- **evaluate.yml** — Runs daily at 9 AM UTC, collects metrics for sent campaigns
- **optimize.yml** — Runs weekly on Mondays, generates improved campaign drafts

Add these secrets to your GitHub repo:
- `MAILERLITE_API_KEY`
- `ANTHROPIC_API_KEY` (for Claude Code CLI in CI)

## How It Works

1. Send a baseline campaign manually
2. `evaluate` collects open rate + click rate metrics
3. `generate` uses Claude to analyze what worked and create an improved draft
4. Review the draft in MailerLite, then `send` it
5. Repeat — the system hill-climbs toward better engagement
