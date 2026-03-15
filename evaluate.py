"""Metric evaluation and scoring for newsletter campaigns. Immutable — do not modify."""

from datetime import datetime, timezone


def compute_score(stats: dict) -> float:
    """
    Composite engagement score from campaign stats. Higher is better.

    Formula: 0.4 * open_rate + 0.6 * click_to_open_rate

    Click-to-open rate weighted higher because it measures deeper engagement:
    someone who opened AND clicked is more valuable than someone who just opened.

    Returns a score between 0.0 and 1.0.
    """
    open_rate = float(stats.get("open_rate", 0))
    clicks = int(stats.get("unique_clicks_count", 0))
    opens = int(stats.get("unique_opens_count", 0))

    # Click-to-open rate: clicks / opens (only among those who opened)
    click_to_open_rate = (clicks / opens) if opens > 0 else 0.0

    # Normalize: open_rate from MailerLite is already a ratio (0-1 range)
    # If it comes as percentage (0-100), normalize it
    if open_rate > 1:
        open_rate = open_rate / 100.0
    if click_to_open_rate > 1:
        click_to_open_rate = click_to_open_rate / 100.0

    score = 0.4 * open_rate + 0.6 * click_to_open_rate
    return round(score, 4)


def has_sufficient_data(stats: dict, min_sent: int = 50, min_hours: int = 24) -> bool:
    """
    Check if a campaign has enough data to evaluate reliably.

    Args:
        stats: Campaign statistics dict with 'sent' and 'sent_at' fields.
        min_sent: Minimum number of emails sent.
        min_hours: Minimum hours since send to allow metric stabilization.
    """
    sent_count = int(stats.get("sent", 0))
    if sent_count < min_sent:
        return False

    sent_at = stats.get("sent_at", "")
    if not sent_at:
        return False

    try:
        send_time = datetime.fromisoformat(sent_at.replace("Z", "+00:00"))
        hours_elapsed = (datetime.now(timezone.utc) - send_time).total_seconds() / 3600
        return hours_elapsed >= min_hours
    except (ValueError, TypeError):
        return False


def compare_scores(current: float, baseline: float, threshold: float = 0.01) -> str:
    """
    Compare current score against baseline using hill-climbing logic.

    Returns:
        'keep'    — current beats baseline by more than threshold
        'discard' — current is worse than or equal to baseline
        'tie'     — difference is within threshold (keep as marginal improvement)
    """
    diff = current - baseline
    if diff > threshold:
        return "keep"
    elif diff < -threshold:
        return "discard"
    else:
        return "tie"


def format_score_summary(stats: dict, score: float) -> str:
    """Format a human-readable summary of campaign performance."""
    open_rate = float(stats.get("open_rate", 0))
    if open_rate > 1:
        open_rate = open_rate / 100.0

    clicks = int(stats.get("unique_clicks_count", 0))
    opens = int(stats.get("unique_opens_count", 0))
    sent = int(stats.get("sent", 0))
    ctor = (clicks / opens * 100) if opens > 0 else 0.0

    return (
        f"Sent: {sent} | Opens: {opens} ({open_rate*100:.1f}%) | "
        f"Clicks: {clicks} (CTOR: {ctor:.1f}%) | Score: {score:.4f}"
    )
