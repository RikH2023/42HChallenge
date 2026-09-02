"""Request and response schemas.

Separate stored/public shapes on purpose:

    StoredReport   - what goes into reports.json (includes phone)
    PublicReport   - what GET /reports returns (no phone)

Keeping these separate is what stops the phone number leaking. If you
serialise the stored record directly, every caller of GET /reports gets a
list of phone numbers.

Messages have no PII, so there is only one shape for them.
"""

from typing import Literal

from pydantic import BaseModel, Field

# Rough bounding box for the Netherlands (WGS84).
# Anything outside this is a bad geocode, not a real Dutch address.
NL_LAT_MIN = 50.7
NL_LAT_MAX = 53.6
NL_LNG_MIN = 3.3
NL_LNG_MAX = 7.2


def in_netherlands(lat: float, lng: float) -> bool:
    """True if the coordinate falls inside the NL bounding box."""
    return NL_LAT_MIN <= lat <= NL_LAT_MAX and NL_LNG_MIN <= lng <= NL_LNG_MAX


def normalise_city(city: str) -> str:
    """Collapse whitespace and casing so cities compare reliably.

    A report tagged "Eindhoven" and an admin typing "eindhoven " must land
    on the same key, otherwise the message never reaches the reports.

    This does NOT fix spelling variants. PDOK returns "'s-Hertogenbosch";
    an admin typing "Den Bosch" still will not match.
    """
    return " ".join(city.split()).casefold()


Score = Literal[1, 2, 3]
Severity = Literal["low", "mid", "high"]


# --------------------------------------------------------------------------
# Reports
# --------------------------------------------------------------------------


# E.164: a plus, then 8-15 digits. Worth enforcing now that these numbers
# get handed to an SMS gateway, which will reject anything malformed.
E164 = r"^\+[1-9]\d{7,14}$"


class ReportIn(BaseModel):
    """POST /reports body."""

    phone: str = Field(..., pattern=E164, examples=["+31612345678"])
    address: str = Field(..., min_length=1, examples=["Dorpsstraat 1, Oirschot"])
    flood_level: Score
    water_movement: Score
    road_condition: Score


class StoredReport(BaseModel):
    """One record as written to reports.json."""

    id: str
    phone: str
    lat: float
    lng: float
    severity: Severity
    city: str


class PublicReport(BaseModel):
    """One record as returned by GET /reports. No phone."""

    id: str
    lat: float
    lng: float
    severity: Severity
    city: str

    @classmethod
    def from_stored(cls, stored: StoredReport) -> "PublicReport":
        return cls(
            id=stored.id,
            lat=stored.lat,
            lng=stored.lng,
            severity=stored.severity,
            city=stored.city,
        )


# --------------------------------------------------------------------------
# Admin messages
# --------------------------------------------------------------------------


class MessageIn(BaseModel):
    """POST /admin/messages body."""

    city: str = Field(..., min_length=1, examples=["Eindhoven"])
    msg: str = Field(..., min_length=1, examples=["Evacuate to the shelter on X"])


class Message(BaseModel):
    """One record as written to messages.json."""

    id: str
    city: str
    msg: str


class CitySummary(BaseModel):
    """One entry from GET /admin/cities."""

    city: str
    report_count: int
    highest_severity: Severity


class DeliveryResult(BaseModel):
    """What happened when a message went out."""

    provider: str
    recipients: int
    sent: int
    failed: int
    failures: list[str] = Field(default_factory=list)


class MessageCreated(BaseModel):
    """POST /admin/messages response: the stored message plus delivery."""

    message: Message
    delivery: DeliveryResult