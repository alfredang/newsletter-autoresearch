"""
Orchestrator for the newsletter autoresearch loop.

Usage:
    python run.py generate   — Evaluate last campaign, generate improved draft
    python run.py evaluate   — Collect metrics for pending campaigns
    python run.py send --campaign-id <ID>  — Schedule a draft campaign for sending
    python run.py status     — Show current experiment status
"""

import argparse
import csv
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from evaluate import compute_score, compare_scores, has_sufficient_data, format_score_summary
from mailerlite_client import MailerLiteClient
from optimize import generate_improved_campaign, load_results_history, load_program, load_template


RESULTS_FILE = "results.tsv"
RESULTS_HEADERS = [
    "timestamp", "campaign_id", "subject", "score",
    "open_rate", "click_rate", "status", "description",
]


def init_results_file():
    """Create results.tsv with headers if it doesn't exist."""
    path = Path(RESULTS_FILE)
    if not path.exists():
        with open(path, "w", newline="") as f:
            writer = csv.writer(f, delimiter="\t")
            writer.writerow(RESULTS_HEADERS)


def append_result(row: dict):
    """Append a result row to results.tsv."""
    init_results_file()
    with open(RESULTS_FILE, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=RESULTS_HEADERS, delimiter="\t")
        writer.writerow(row)


def read_results() -> list[dict]:
    """Read all results from results.tsv."""
    path = Path(RESULTS_FILE)
    if not path.exists():
        return []
    with open(path) as f:
        reader = csv.DictReader(f, delimiter="\t")
        return list(reader)


def update_result_status(campaign_id: str, score: float, open_rate: float,
                          click_rate: float, status: str):
    """Update a pending result with final metrics."""
    results = read_results()
    updated = False
    for row in results:
        if row["campaign_id"] == campaign_id and row["status"] == "pending":
            row["score"] = f"{score:.4f}"
            row["open_rate"] = f"{open_rate:.4f}"
            row["click_rate"] = f"{click_rate:.4f}"
            row["status"] = status
            updated = True
            break

    if updated:
        with open(RESULTS_FILE, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=RESULTS_HEADERS, delimiter="\t")
            writer.writeheader()
            writer.writerows(results)


def get_best_result() -> dict | None:
    """Get the best-performing campaign from results history."""
    results = read_results()
    best = None
    best_score = -1.0
    for row in results:
        if row["status"] == "keep":
            try:
                score = float(row["score"])
                if score > best_score:
                    best_score = score
                    best = row
            except (ValueError, KeyError):
                continue
    return best


def get_pending_results() -> list[dict]:
    """Get campaigns with pending status."""
    return [r for r in read_results() if r["status"] == "pending"]


# ── Commands ───────────────────────────────────────────────────


def cmd_generate(client: MailerLiteClient):
    """Evaluate last campaign (if ready), then generate an improved draft."""
    init_results_file()

    # Step 1: Check if any pending campaigns are ready to evaluate
    pending = get_pending_results()
    for p in pending:
        cid = p["campaign_id"]
        print(f"Checking pending campaign {cid}...")
        try:
            report = client.get_campaign_report(cid)
            if has_sufficient_data(report):
                score = compute_score(report)
                print(f"  {format_score_summary(report, score)}")

                best = get_best_result()
                baseline_score = float(best["score"]) if best else 0.0
                decision = compare_scores(score, baseline_score)

                print(f"  Decision: {decision} (baseline: {baseline_score:.4f})")
                update_result_status(
                    cid, score,
                    float(report.get("open_rate", 0)),
                    float(report.get("click_rate", 0)),
                    decision,
                )
            else:
                print(f"  Not enough data yet. Skipping evaluation.")
        except Exception as e:
            print(f"  Error evaluating {cid}: {e}")

    # Step 2: Generate improved campaign
    print("\nGenerating improved campaign...")
    history = load_results_history()
    program = load_program()
    template = load_template()
    best = get_best_result()

    campaign = generate_improved_campaign(history, program, best, template)

    print(f"  Subject: {campaign['subject']}")
    print(f"  Preview: {campaign['preview_text']}")
    print(f"  Strategy: {campaign['description']}")

    # Step 3: Create draft in MailerLite
    print("\nCreating draft campaign in MailerLite...")
    name = f"Autoresearch #{len(read_results()) + 1} — {datetime.now().strftime('%Y-%m-%d')}"

    ml_campaign = client.create_campaign(
        name=name,
        subject=campaign["subject"],
        content_html=campaign["html_content"],
    )

    campaign_id = ml_campaign.get("id", "unknown")
    print(f"  Created draft campaign: {campaign_id}")

    # Step 4: Log to results.tsv
    append_result({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "campaign_id": campaign_id,
        "subject": campaign["subject"],
        "score": "0.0000",
        "open_rate": "0.0000",
        "click_rate": "0.0000",
        "status": "pending",
        "description": campaign["description"],
    })

    print(f"\nDraft created. Review it in MailerLite, then run:")
    print(f"  python run.py send --campaign-id {campaign_id}")


def cmd_evaluate(client: MailerLiteClient):
    """Collect metrics for all pending campaigns."""
    init_results_file()
    pending = get_pending_results()

    if not pending:
        print("No pending campaigns to evaluate.")

        # Also check recent sent campaigns not in results
        print("\nRecent sent campaigns:")
        sent = client.list_campaigns(status="sent", limit=5)
        for c in sent:
            report = client.get_campaign_report(c["id"])
            score = compute_score(report)
            print(f"  {c['name']}: {format_score_summary(report, score)}")
        return

    best = get_best_result()
    baseline_score = float(best["score"]) if best else 0.0

    for p in pending:
        cid = p["campaign_id"]
        print(f"Evaluating campaign {cid} ({p['subject']})...")

        try:
            report = client.get_campaign_report(cid)

            if not has_sufficient_data(report):
                sent = report.get("sent", 0)
                print(f"  Insufficient data (sent: {sent}). Waiting...")
                continue

            score = compute_score(report)
            decision = compare_scores(score, baseline_score)

            print(f"  {format_score_summary(report, score)}")
            print(f"  Decision: {decision} (baseline: {baseline_score:.4f})")

            update_result_status(
                cid, score,
                float(report.get("open_rate", 0)),
                float(report.get("click_rate", 0)),
                decision,
            )

            if decision == "keep":
                baseline_score = score  # new baseline for subsequent evaluations

        except Exception as e:
            print(f"  Error: {e}")


def cmd_send(client: MailerLiteClient, campaign_id: str):
    """Schedule a draft campaign for immediate sending."""
    print(f"Scheduling campaign {campaign_id} for immediate delivery...")
    try:
        client.schedule_campaign(campaign_id, delivery="instant")
        print("Campaign scheduled for sending!")
    except Exception as e:
        print(f"Error scheduling campaign: {e}")
        sys.exit(1)


def cmd_status(client: MailerLiteClient):
    """Show current experiment status."""
    init_results_file()
    results = read_results()

    print("=== Newsletter Autoresearch Status ===\n")

    # Subscriber count
    try:
        count = client.get_subscriber_count()
        print(f"Active subscribers: {count}")
    except Exception:
        print("Could not fetch subscriber count.")

    # Results summary
    total = len(results)
    kept = sum(1 for r in results if r["status"] == "keep")
    discarded = sum(1 for r in results if r["status"] == "discard")
    pending = sum(1 for r in results if r["status"] == "pending")

    print(f"\nExperiments: {total} total | {kept} kept | {discarded} discarded | {pending} pending")

    best = get_best_result()
    if best:
        print(f"\nBest campaign:")
        print(f"  Subject: \"{best['subject']}\"")
        print(f"  Score: {best['score']}")
        print(f"  Strategy: {best['description']}")

    # Recent results
    if results:
        print(f"\nRecent experiments:")
        for r in results[-5:]:
            print(f"  [{r['status']}] Score: {r['score']} | \"{r['subject']}\"")


def main():
    parser = argparse.ArgumentParser(description="Newsletter Autoresearch Orchestrator")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("generate", help="Generate improved campaign draft")
    subparsers.add_parser("evaluate", help="Collect metrics for pending campaigns")
    subparsers.add_parser("status", help="Show experiment status")

    send_parser = subparsers.add_parser("send", help="Send a draft campaign")
    send_parser.add_argument("--campaign-id", required=True, help="Campaign ID to send")

    args = parser.parse_args()

    load_dotenv()
    api_key = os.environ.get("MAILERLITE_API_KEY")
    if not api_key:
        print("Error: MAILERLITE_API_KEY not set in .env")
        sys.exit(1)

    with MailerLiteClient(api_key) as client:
        if args.command == "generate":
            cmd_generate(client)
        elif args.command == "evaluate":
            cmd_evaluate(client)
        elif args.command == "send":
            cmd_send(client, args.campaign_id)
        elif args.command == "status":
            cmd_status(client)


if __name__ == "__main__":
    main()
