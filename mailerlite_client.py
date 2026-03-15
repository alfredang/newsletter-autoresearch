"""MailerLite API v2 client wrapper. Immutable utility — do not modify during optimization."""

import time
import httpx


class MailerLiteClient:
    BASE_URL = "https://connect.mailerlite.com/api"
    MAX_RETRIES = 3
    RATE_LIMIT_BUFFER = 5  # pause when fewer than this many requests remain

    def __init__(self, api_key: str):
        self.client = httpx.Client(
            base_url=self.BASE_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=30.0,
        )

    def _request(self, method: str, path: str, **kwargs) -> dict:
        """Make an API request with rate-limit handling and retries."""
        for attempt in range(self.MAX_RETRIES):
            response = self.client.request(method, path, **kwargs)

            # Handle rate limiting
            remaining = response.headers.get("X-RateLimit-Remaining")
            if remaining and int(remaining) < self.RATE_LIMIT_BUFFER:
                reset = int(response.headers.get("X-RateLimit-Reset", 60))
                time.sleep(min(reset, 60))

            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 60))
                time.sleep(min(retry_after, 120))
                continue

            response.raise_for_status()
            if response.status_code == 204:
                return {}
            return response.json()

        raise Exception(f"Max retries exceeded for {method} {path}")

    # ── Campaigns ──────────────────────────────────────────────

    def list_campaigns(self, status: str = "sent", limit: int = 25) -> list[dict]:
        """List campaigns filtered by status: draft, ready, sent."""
        data = self._request("GET", "/campaigns", params={
            "filter[status]": status,
            "limit": limit,
        })
        return data.get("data", [])

    def get_campaign(self, campaign_id: str) -> dict:
        """Get a single campaign with stats."""
        data = self._request("GET", f"/campaigns/{campaign_id}")
        return data.get("data", {})

    def create_campaign(
        self,
        name: str,
        subject: str,
        content_html: str,
        sender_email: str = None,
        sender_name: str = None,
        groups: list[str] = None,
        campaign_type: str = "regular",
    ) -> dict:
        """Create a new campaign as a draft."""
        payload = {
            "name": name,
            "type": campaign_type,
            "emails": [{
                "subject": subject,
                "from_name": sender_name or "Tertiary Infotech Academy Pte Ltd",
                "from": sender_email or "newsletter@tertiaryinfotech.com",
                "content": content_html,
            }],
        }
        if groups:
            payload["groups"] = groups

        data = self._request("POST", "/campaigns", json=payload)
        return data.get("data", {})

    def create_ab_campaign(
        self,
        name: str,
        subject_a: str,
        subject_b: str,
        content_html: str,
        sender_email: str = None,
        sender_name: str = None,
        groups: list[str] = None,
        test_split: int = 20,
        select_winner_by: str = "o",  # "o" = open rate, "c" = click rate
    ) -> dict:
        """Create an A/B test campaign with two subject lines."""
        payload = {
            "name": name,
            "type": "ab",
            "ab_settings": {
                "test_type": "subject",
                "select_winner_by": select_winner_by,
                "after_time_amount": 4,
                "after_time_unit": "h",
                "test_split": test_split,
            },
            "emails": [
                {
                    "subject": subject_a,
                    "from_name": sender_name or "Tertiary Infotech Academy Pte Ltd",
                    "from": sender_email or "newsletter@tertiaryinfotech.com",
                    "content": content_html,
                },
                {
                    "subject": subject_b,
                    "from_name": sender_name or "Tertiary Infotech Academy Pte Ltd",
                    "from": sender_email or "newsletter@tertiaryinfotech.com",
                    "content": content_html,
                },
            ],
        }
        if groups:
            payload["groups"] = groups

        data = self._request("POST", "/campaigns", json=payload)
        return data.get("data", {})

    def update_campaign(self, campaign_id: str, **kwargs) -> dict:
        """Update a draft campaign. Pass fields to update as kwargs."""
        data = self._request("PUT", f"/campaigns/{campaign_id}", json=kwargs)
        return data.get("data", {})

    def schedule_campaign(
        self, campaign_id: str, delivery: str = "instant", date: str = None
    ) -> dict:
        """Schedule a campaign. delivery='instant' or 'scheduled' with date."""
        payload = {"delivery": delivery}
        if delivery == "scheduled" and date:
            payload["schedule"] = {"date": date}  # ISO 8601 format
        data = self._request("POST", f"/campaigns/{campaign_id}/schedule", json=payload)
        return data.get("data", {})

    def delete_campaign(self, campaign_id: str) -> None:
        """Delete a draft campaign."""
        self._request("DELETE", f"/campaigns/{campaign_id}")

    # ── Campaign Reports ───────────────────────────────────────

    def get_campaign_report(self, campaign_id: str) -> dict:
        """Get campaign statistics: opens, clicks, bounces, etc."""
        campaign = self.get_campaign(campaign_id)
        stats = campaign.get("stats", {})
        emails = campaign.get("emails", [{}])
        email_stats = emails[0].get("stats", {}) if emails else {}

        return {
            "campaign_id": campaign_id,
            "name": campaign.get("name", ""),
            "status": campaign.get("status", ""),
            "sent": stats.get("sent", 0),
            "opens_count": stats.get("opens_count", 0),
            "unique_opens_count": stats.get("unique_opens_count", 0),
            "clicks_count": stats.get("clicks_count", 0),
            "unique_clicks_count": stats.get("unique_clicks_count", 0),
            "unsubscribes_count": stats.get("unsubscribes_count", 0),
            "spam_count": stats.get("spam_count", 0),
            "open_rate": email_stats.get("open_rate", stats.get("open_rate", 0)),
            "click_rate": email_stats.get("click_rate", stats.get("click_rate", 0)),
            "unsubscribe_rate": stats.get("unsubscribe_rate", 0),
            "sent_at": campaign.get("scheduled_for", ""),
        }

    # ── Subscribers ────────────────────────────────────────────

    def list_subscribers(self, status: str = "active", limit: int = 100) -> list[dict]:
        """List subscribers filtered by status."""
        data = self._request("GET", "/subscribers", params={
            "filter[status]": status,
            "limit": limit,
        })
        return data.get("data", [])

    def get_subscriber_count(self) -> int:
        """Get total active subscriber count."""
        data = self._request("GET", "/subscribers", params={
            "filter[status]": "active",
            "limit": 0,
        })
        return data.get("total", 0)

    # ── Groups ─────────────────────────────────────────────────

    def list_groups(self) -> list[dict]:
        """List all subscriber groups."""
        data = self._request("GET", "/groups", params={"limit": 100})
        return data.get("data", [])

    def close(self):
        """Close the HTTP client."""
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.environ["MAILERLITE_API_KEY"]

    with MailerLiteClient(api_key) as client:
        count = client.get_subscriber_count()
        print(f"Active subscribers: {count}")

        groups = client.list_groups()
        print(f"Groups: {[g['name'] for g in groups]}")

        campaigns = client.list_campaigns(status="sent", limit=5)
        for c in campaigns:
            print(f"  Campaign: {c['name']} — {c.get('status')}")
