"""Flood report API.

Public:
    POST   /reports               submit a report
    GET    /reports               list reports for the map
    GET    /messages              messages, optionally filtered by city

Admin:
    GET    /admin/cities          cities that currently have reports
    POST   /admin/messages        store a message for a city
    GET    /admin/messages        list stored messages
    DELETE /admin/messages/{id}   retract a message

NOTE: the /admin routes have no authentication. Anyone who can reach the
server can broadcast a warning to any city. Acceptable for a prototype;
put auth in front of them before this is reachable from anywhere real.

Run with:  uvicorn main:app --reload
Docs at:   http://127.0.0.1:8000/docs
"""

import uuid

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import storage
from geocoding import GeocodeError, geocode
from models import (
    CitySummary,
    Message,
    MessageIn,
    PublicReport,
    ReportIn,
    StoredReport,
    in_netherlands,
    normalise_city,
)
from severity import compute_severity

app = FastAPI(title="Flood Report API", version="0.2.0")

# The frontend runs on a different origin during development.
# Tighten this to the real frontend origin before anything goes public.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

# Ranking used to report the worst severity per city.
_SEVERITY_RANK = {"low": 0, "mid": 1, "high": 2}


# --------------------------------------------------------------------------
# Reports
# --------------------------------------------------------------------------


@app.post("/reports", response_model=PublicReport, status_code=201, tags=["reports"])
def create_report(payload: ReportIn) -> PublicReport:
    """Accept a flood report.

    The address is geocoded through PDOK, which supplies both the coordinate
    and the canonical city name. The three 1-3 scores collapse into a
    severity band. The raw scores and the address itself are not stored.
    """
    try:
        location = geocode(payload.address)
    except GeocodeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except httpx.HTTPError as error:
        # PDOK is down or timed out. That is not the client's fault.
        raise HTTPException(
            status_code=502, detail="Geocoding service unavailable"
        ) from error

    if not in_netherlands(location.lat, location.lng):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Address resolved to ({location.lat}, {location.lng}), "
                "outside the Netherlands"
            ),
        )

    stored = StoredReport(
        id=str(uuid.uuid4()),
        phone=payload.phone,
        lat=location.lat,
        lng=location.lng,
        severity=compute_severity(
            payload.flood_level,
            payload.water_movement,
            payload.road_condition,
        ),
        city=location.city,
    )
    storage.add_report(stored)

    # Return the public shape, not the stored one. No phone goes back out.
    return PublicReport.from_stored(stored)


@app.get("/reports", response_model=list[PublicReport], tags=["reports"])
def get_reports() -> list[PublicReport]:
    """Every report, without phone numbers, ready to plot on the map."""
    return [PublicReport.from_stored(report) for report in storage.list_reports()]


# --------------------------------------------------------------------------
# Admin
# --------------------------------------------------------------------------


@app.get("/admin/cities", response_model=list[CitySummary], tags=["admin"])
def get_cities() -> list[CitySummary]:
    """Cities that currently have at least one report.

    Also returns how many reports each has and the worst severity among
    them, so the admin screen can sort by urgency instead of alphabetically.
    """
    buckets: dict[str, CitySummary] = {}

    for report in storage.list_reports():
        key = normalise_city(report.city)
        existing = buckets.get(key)
        if existing is None:
            buckets[key] = CitySummary(
                city=report.city,
                report_count=1,
                highest_severity=report.severity,
            )
            continue

        existing.report_count += 1
        if _SEVERITY_RANK[report.severity] > _SEVERITY_RANK[existing.highest_severity]:
            existing.highest_severity = report.severity

    return sorted(
        buckets.values(),
        key=lambda item: (-_SEVERITY_RANK[item.highest_severity], item.city),
    )


@app.post("/admin/messages", response_model=Message, status_code=201, tags=["admin"])
def create_message(payload: MessageIn) -> Message:
    """Store a message aimed at one city.

    The city is not checked against existing reports, so an admin can warn a
    city before any report comes in. Flip `strict_city` below if you would
    rather reject cities with no active reports.
    """
    strict_city = False

    if strict_city:
        known = {normalise_city(r.city) for r in storage.list_reports()}
        if normalise_city(payload.city) not in known:
            raise HTTPException(
                status_code=400,
                detail=f"No active reports for city: {payload.city!r}",
            )

    message = Message(
        id=str(uuid.uuid4()),
        city=payload.city.strip(),
        msg=payload.msg,
    )
    storage.add_message(message)
    return message


@app.get("/admin/messages", response_model=list[Message], tags=["admin"])
def get_admin_messages() -> list[Message]:
    """Every stored message."""
    return storage.list_messages()


@app.delete("/admin/messages/{message_id}", status_code=204, tags=["admin"])
def remove_message(message_id: str) -> None:
    """Retract a message."""
    if not storage.delete_message(message_id):
        raise HTTPException(status_code=404, detail="Message not found")


# --------------------------------------------------------------------------
# Public message read
# --------------------------------------------------------------------------


@app.get("/messages", response_model=list[Message], tags=["reports"])
def get_messages(
    city: str | None = Query(default=None, examples=["Eindhoven"]),
) -> list[Message]:
    """Messages for the frontend to display, optionally filtered by city.

    Matching is case- and whitespace-insensitive, so "eindhoven" finds
    messages stored as "Eindhoven".
    """
    messages = storage.list_messages()
    if city is None:
        return messages

    wanted = normalise_city(city)
    return [m for m in messages if normalise_city(m.city) == wanted]
