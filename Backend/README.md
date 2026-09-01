# Flood Report API

Python backend for the flood tracker prototype. FastAPI + flat JSON files.

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Interactive docs: http://127.0.0.1:8000/docs

## Public endpoints

### POST /reports

```json
{
  "phone": "+31612345678",
  "address": "Dorpsstraat 1, Oirschot",
  "flood_level": 3,
  "water_movement": 3,
  "road_condition": 1
}
```

The address is geocoded through PDOK, which returns both the coordinate and
the canonical city name. Returns 201 with the public shape (no phone):

```json
{ "id": "uuid4", "lat": 51.5, "lng": 5.3, "severity": "high", "city": "Oirschot" }
```

| Status | Cause |
|--------|-------|
| 400 | Address did not resolve, or resolved outside the Netherlands |
| 422 | A score was not 1, 2 or 3, or a field was missing |
| 502 | PDOK unreachable or timed out |

### GET /reports

Every report, phone stripped. Same shape as above, as a list.

### GET /messages?city=Eindhoven

Messages for the frontend. `city` is optional; matching ignores case and
surrounding whitespace.

## Admin endpoints

No authentication. Anyone who can reach the server can broadcast to any
city. Fine for a prototype, not for anything public.

### GET /admin/cities

Cities with at least one report, worst-severity-first.

```json
[ { "city": "Oirschot", "report_count": 1, "highest_severity": "high" } ]
```

### POST /admin/messages

```json
{ "city": "Eindhoven", "msg": "Evacuate to the shelter on X" }
```

Returns 201 with `{ "id": "uuid4", "city": "Eindhoven", "msg": "..." }`.

Cities are not validated against active reports, so an admin can warn a city
pre-emptively. Set `strict_city = True` in `main.py` to reject unknown cities.

### GET /admin/messages

All stored messages.

### DELETE /admin/messages/{id}

204 on success, 404 if the id is unknown.

## Severity

Each input is 1-3, averaged and rounded half-up: 1 = low, 2 = mid, 3 = high.
Floor rule: `flood_level == 3 and water_movement == 3` is always `high`.

## Storage

| File | Contents |
|------|----------|
| `reports.json` | id, phone, lat, lng, severity, city |
| `messages.json` | id, city, msg |

Both are created on first write.

## Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, all endpoints |
| `models.py` | Schemas, NL bounding box, city normalisation |
| `severity.py` | Score to band |
| `geocoding.py` | PDOK client |
| `storage.py` | JSON read/write for both files |
