"""SMS delivery.

Two providers behind one interface:

    ConsoleSMSProvider      logs to stdout, sends nothing   (default)
    MessageBirdSMSProvider  actually sends, costs money

The default is deliberately the one that cannot reach a real phone. This
endpoint has no authentication, and an unauthenticated route that texts
evacuation warnings to real numbers is not something to leave switched on by
accident. Real sending requires setting SMS_PROVIDER=messagebird explicitly.

Environment:
    SMS_PROVIDER          "console" (default) or "messagebird"
    MESSAGEBIRD_API_KEY   required when SMS_PROVIDER=messagebird
    SMS_ORIGINATOR        sender name or number, default "FloodAlert"
"""

import logging
import os
from dataclasses import dataclass

import httpx

logger = logging.getLogger("sms")

MESSAGEBIRD_URL = "https://rest.messagebird.com/messages"


@dataclass
class SendResult:
    phone: str
    ok: bool
    error: str | None = None


class SMSProvider:
    def send(self, phone: str, text: str) -> SendResult:
        raise NotImplementedError


class ConsoleSMSProvider(SMSProvider):
    """Pretends to send. Use for development and demos."""

    name = "console"

    def send(self, phone: str, text: str) -> SendResult:
        logger.info("[SMS -> %s] %s", phone, text)
        return SendResult(phone=phone, ok=True)


class MessageBirdSMSProvider(SMSProvider):
    """Sends for real through MessageBird. Each message costs money."""

    name = "messagebird"

    def __init__(self, api_key: str, originator: str) -> None:
        self._api_key = api_key
        self._originator = originator

    def send(self, phone: str, text: str) -> SendResult:
        try:
            response = httpx.post(
                MESSAGEBIRD_URL,
                headers={"Authorization": f"AccessKey {self._api_key}"},
                data={
                    "recipients": phone,
                    "originator": self._originator,
                    "body": text,
                },
                timeout=10.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            # One bad number must not abort the whole batch.
            logger.warning("SMS to %s failed: %s", phone, error)
            return SendResult(phone=phone, ok=False, error=str(error))
        return SendResult(phone=phone, ok=True)


def build_provider() -> SMSProvider:
    """Pick a provider from the environment. Defaults to console."""
    choice = os.getenv("SMS_PROVIDER", "console").strip().lower()

    if choice == "console":
        return ConsoleSMSProvider()

    if choice == "messagebird":
        api_key = os.getenv("MESSAGEBIRD_API_KEY")
        if not api_key:
            raise RuntimeError(
                "SMS_PROVIDER=messagebird but MESSAGEBIRD_API_KEY is not set"
            )
        originator = os.getenv("SMS_ORIGINATOR", "FloodAlert")
        logger.warning("SMS provider is MessageBird. Messages will really send.")
        return MessageBirdSMSProvider(api_key=api_key, originator=originator)

    raise RuntimeError(f"Unknown SMS_PROVIDER: {choice!r}")
