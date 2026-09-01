"""Address -> coordinates + city via the PDOK Locatieserver.

PDOK is the Dutch national geo-data platform. The "free" endpoint is classic
geocoding: give it an address string, get matches back. It is open, free and
needs no API key.

The city comes from PDOK's own `woonplaatsnaam` field rather than from
splitting the user's address string. Users type addresses inconsistently
("Dorpsstraat 1 Oirschot", "Dorpsstraat 1, 5688 AB Oirschot"), so a comma
split is unreliable. PDOK returns the canonical spelling.

Note for v3.1: query parameters that are not in the OpenAPI spec are
rejected, so only send documented ones (q, fq, rows, fl, wt).
"""

import re
from dataclasses import dataclass

import httpx

PDOK_FREE_URL = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free"

# centroide_ll comes back as the WKT string "POINT(5.3 51.5)" -> lng first.
_POINT_RE = re.compile(r"POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)")


class GeocodeError(Exception):
    """Address could not be resolved to a coordinate."""


@dataclass(frozen=True)
class GeocodeResult:
    lat: float
    lng: float
    city: str


def _parse_point(wkt: str) -> tuple[float, float]:
    """Parse "POINT(lng lat)" into (lat, lng). Note the order swap."""
    match = _POINT_RE.match(wkt.strip())
    if not match:
        raise GeocodeError(f"Could not parse coordinate from PDOK: {wkt!r}")
    lng, lat = float(match.group(1)), float(match.group(2))
    return lat, lng


def geocode(address: str, timeout: float = 5.0) -> GeocodeResult:
    """Return lat, lng and city for a Dutch address.

    Raises GeocodeError when the address does not resolve, and
    httpx.HTTPError when PDOK itself is unreachable.
    """
    params = {
        "q": address,
        "fq": "type:adres",          # addresses only, not roads or districts
        "rows": 1,                    # best match only
        "fl": "centroide_ll,woonplaatsnaam,weergavenaam",
    }

    response = httpx.get(PDOK_FREE_URL, params=params, timeout=timeout)
    response.raise_for_status()

    docs = response.json().get("response", {}).get("docs", [])
    if not docs:
        raise GeocodeError(f"No match found for address: {address!r}")

    doc = docs[0]

    centroid = doc.get("centroide_ll")
    if not centroid:
        raise GeocodeError(f"PDOK returned no coordinate for: {address!r}")

    city = doc.get("woonplaatsnaam")
    if not city:
        raise GeocodeError(f"PDOK returned no city for: {address!r}")

    lat, lng = _parse_point(centroid)
    return GeocodeResult(lat=lat, lng=lng, city=city)
